import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import redis from '@/lib/redis'
import { processFile } from '@/app/api/upload/route'

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId
  const jobData = await redis.get(`job:${jobId}`)

  if (!jobData) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const parsedJobData = JSON.parse(jobData)

  // Only allow resuming cancelled jobs
  if (parsedJobData.status !== 'cancelled') {
    return NextResponse.json(
      { error: 'Can only resume cancelled jobs' },
      { status: 400 }
    )
  }

  // Read the saved file
  const filePath = path.join(process.cwd(), 'uploaded_files', `${jobId}.csv`)
  const fileBuffer = await readFile(filePath)

  // Remove cancellation flag
  await redis.del(`job:${jobId}:cancelled`)

  // Resume processing from last processed index
  processFile(
    fileBuffer,
    parsedJobData.fileHash,
    jobId,
    parsedJobData.lastProcessedIndex || 0
  )

  return NextResponse.json({ status: 'resumed' })
}
