import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId
  const jobData = await redis.get(`job:${jobId}`)

  if (!jobData) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json(JSON.parse(jobData))
} 