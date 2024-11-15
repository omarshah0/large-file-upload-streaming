'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface JobStatus {
  status: string
  fileHash: string
  totalRecords: number
  processedRecords: number
  successCount: number
  failCount: number
}

export default function Home() {
  const [jobs, setJobs] = useState<Record<string, JobStatus>>({})

  useEffect(() => {
    const fetchJobs = async () => {
      const response = await fetch('/api/jobs')
      const data = await response.json()
      setJobs(data)
    }

    fetchJobs()
    const interval = setInterval(fetchJobs, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className='w-screen h-screen p-8 bg-slate-50'>
      <div className='max-w-4xl mx-auto'>
        <div className='flex justify-between items-center mb-8'>
          <h1 className='text-2xl font-bold'>Job Status Dashboard</h1>
          <Link href="/omar" className='text-blue-600 hover:text-blue-800'>Upload New File</Link>
        </div>

        <div className='grid gap-4'>
          {Object.entries(jobs).map(([jobId, status]) => (
            <Link href={`/jobs/${jobId}`} key={jobId} className='bg-white p-4 rounded-lg shadow'>
              <div className='flex justify-between mb-2'>
                <span className='font-semibold'>Job ID: {jobId}</span>
                <span className={`px-2 py-1 rounded text-sm ${status.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  status.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                  {status?.status || 'cancelled'}
                </span>
              </div>
              <div className='grid grid-cols-2 gap-2 text-sm'>
                <div>Processed: {status.processedRecords}/{status.totalRecords}</div>
                <div>Success: {status.successCount}</div>
                <div>Failed: {status.failCount}</div>
                <div>File Hash: {status.fileHash ? status.fileHash.slice(0, 8) + '...' : 'N/A'}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
