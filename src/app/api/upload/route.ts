/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'csv-parse'
import { Readable } from 'stream'
import { createHash } from 'crypto'
import { writeFile } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Components
import prisma from '@/lib/db'
import redis from '@/lib/redis'

export const config = {
  runtime: 'edge',
}

async function calculateFileHash(buffer: Buffer): Promise<string> {
  return createHash('sha256').update(buffer).digest('hex')
}

async function saveFile(buffer: Buffer, jobId: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'uploaded_files')
  const filePath = path.join(uploadDir, `${jobId}.csv`)
  await writeFile(filePath, buffer)
  return filePath
}

async function countRecords(fileBuffer: Buffer): Promise<number> {
  const fileStream = Readable.from(fileBuffer)
  const parser = fileStream.pipe(parse({ columns: true }))
  let count = 0
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const _ of parser) {
    count++
  }
  return count
}

interface JobData {
  status: 'processing' | 'completed' | 'cancelled'
  fileHash: string
  fileName: string
  totalRecords: number
  processedRecords: number
  successCount: number
  failCount: number
  lastProcessedIndex?: number
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const fileHash = await calculateFileHash(fileBuffer)
  const jobId = uuidv4()

  // Save file
  await saveFile(fileBuffer, jobId)

  // Initialize job in Redis
  const jobData: JobData = {
    status: 'processing',
    fileHash,
    fileName: file.name,
    totalRecords: 0,
    processedRecords: 0,
    successCount: 0,
    failCount: 0,
    lastProcessedIndex: 0,
  }
  await redis.set(`job:${jobId}`, JSON.stringify(jobData))

  // Start processing in background
  processFile(fileBuffer, fileHash, jobId, 0)

  return NextResponse.json({ jobId })
}

export async function processFile(
  fileBuffer: Buffer,
  fileHash: string,
  jobId: string,
  startIndex: number = 0
) {
  // Count total records first
  const totalRecords = await countRecords(fileBuffer)

  // Get existing job data or create new
  const existingJobData = await redis.get(`job:${jobId}`)
  const jobData: JobData = existingJobData
    ? JSON.parse(existingJobData)
    : {
        status: 'processing',
        fileHash,
        fileName: '',
        totalRecords,
        processedRecords: 0,
        successCount: 0,
        failCount: 0,
        lastProcessedIndex: 0,
      }

  jobData.status = 'processing'
  jobData.totalRecords = totalRecords
  await redis.set(`job:${jobId}`, JSON.stringify(jobData))

  // Start actual processing
  const fileStream = Readable.from(fileBuffer)
  const parser = fileStream.pipe(parse({ columns: true }))

  let currentIndex = 0
  let { processedRecords, successCount, failCount } = jobData

  for await (const record of parser) {
    // Skip records until we reach the start index
    if (currentIndex++ < startIndex) continue

    // Check if job was cancelled
    const isCancelled = await redis.get(`job:${jobId}:cancelled`)
    if (isCancelled) {
      const currentJobData = await redis.get(`job:${jobId}`)
      if (currentJobData) {
        const parsedJobData = JSON.parse(currentJobData)
        parsedJobData.status = 'cancelled'
        parsedJobData.lastProcessedIndex = currentIndex - 1
        await redis.set(`job:${jobId}`, JSON.stringify(parsedJobData))
      }
      return
    }

    try {
      // Validate record
      if (!record.name || !record.email) {
        failCount++
        await prisma.failedRecord.create({
          data: {
            name: record.name || '',
            email: record.email || '',
            error: 'Missing required fields',
            jobId,
          },
        })
        processedRecords++
        continue
      }

      // Check if record with same email exists
      const existingRecord = await prisma.record.findUnique({
        where: { email: record.email },
      })

      const randomlyFailRecord = Math.random() < 0.1
      if (randomlyFailRecord) {
        failCount++
        await prisma.failedRecord.create({
          data: {
            name: record.name,
            email: record.email,
            error: 'Random failure for testing',
            jobId,
          },
        })
        processedRecords++
        continue
      }

      if (existingRecord) {
        if (existingRecord.fileHash === fileHash) {
          successCount++
        } else {
          failCount++
          await prisma.failedRecord.create({
            data: {
              name: record.name,
              email: record.email,
              error: 'Email already exists',
              jobId,
            },
          })
        }
      } else {
        // Process new record
        await prisma.record.create({
          data: {
            name: record.name,
            email: record.email,
            fileHash,
            jobId,
          },
        })
        successCount++
      }

      processedRecords++

      // Update lastProcessedIndex with each record
      if (processedRecords % 100 === 0) {
        await redis.set(
          `job:${jobId}`,
          JSON.stringify({
            ...jobData,
            status: 'processing',
            processedRecords,
            successCount,
            failCount,
            lastProcessedIndex: currentIndex - 1,
          })
        )
      }
    } catch (error: any) {
      failCount++
      processedRecords++
      await prisma.failedRecord.create({
        data: {
          name: record.name || '',
          email: record.email || '',
          error: error.message,
          jobId,
        },
      })
    }
  }

  // Update final status
  await redis.set(
    `job:${jobId}`,
    JSON.stringify({
      ...jobData,
      status: 'completed',
      processedRecords,
      successCount,
      failCount,
      lastProcessedIndex: currentIndex - 1,
    })
  )
}
