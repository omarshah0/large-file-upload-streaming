import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'

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

  // Only allow cancellation of processing jobs
  if (parsedJobData.status !== 'processing') {
    return NextResponse.json(
      { error: 'Can only cancel processing jobs' },
      { status: 400 }
    )
  }

  // Set cancellation flag
  await redis.set(`job:${jobId}:cancelled`, '1')

  // Update existing job status to cancelled
  parsedJobData.status = 'cancelled'
  await redis.set(`job:${jobId}`, JSON.stringify(parsedJobData))

  return NextResponse.json({ status: 'cancelled' })
}
