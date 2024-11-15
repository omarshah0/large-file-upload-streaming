import { NextResponse } from 'next/server'
import redis from '@/lib/redis'

export async function GET() {
  // Get all keys matching the job pattern
  const keys = await redis.keys('job:*')

  // If no jobs found, return empty object
  if (!keys.length) {
    return NextResponse.json({})
  }

  // Get all job data
  const jobsData = await Promise.all(
    keys.map(async key => {
      const data = await redis.get(key)
      return [key.replace('job:', ''), JSON.parse(data as string)]
    })
  )

  // Convert array of entries to object
  const jobs = Object.fromEntries(jobsData)

  return NextResponse.json(jobs)
}
