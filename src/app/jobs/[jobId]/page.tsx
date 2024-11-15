"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import Link from 'next/link'

interface JobStatus {
  status: 'processing' | 'completed' | 'cancelled'
  fileHash: string
  totalRecords: number
  processedRecords: number
  successCount: number
  failCount: number
}

export default function JobStatus() {
  const { jobId } = useParams()
  const [status, setStatus] = useState<JobStatus | null>(null)

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`)
        const data = await response.json()
        setStatus(data)

        // Continue polling if job is still processing
        if (data.status === 'processing') {
          setTimeout(pollStatus, 1000)
        }
      } catch (error) {
        console.error('Error fetching job status:', error)
      }
    }

    pollStatus()
  }, [jobId])

  const handleCancel = async () => {
    try {
      await fetch(`/api/jobs/${jobId}/cancel`, {
        method: 'POST',
      })
      // Refresh the status immediately after cancelling
      const response = await fetch(`/api/jobs/${jobId}`)
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Error cancelling job:', error)
    }
  }

  const handleResume = async () => {
    try {
      await fetch(`/api/jobs/${jobId}/resume`, {
        method: 'POST',
      })
      // Refresh the status immediately after resuming
      const response = await fetch(`/api/jobs/${jobId}`)
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Error resuming job:', error)
    }
  }

  if (!status) return <div>Loading...</div>

  const progress = status.totalRecords > 0
    ? Math.round((status.processedRecords / status.totalRecords) * 100)
    : 0

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Upload Progress</h1>

      <div className="mb-4">
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${status.status === 'cancelled' ? 'bg-red-600' : 'bg-blue-600'
              }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {progress}% Complete
        </div>
      </div>

      <div className="space-y-2">
        <p>Status: {status.status}</p>
        <p>Total Records: {status.totalRecords}</p>
        <p>Processed: {status.processedRecords}</p>
        <p className="text-green-600">Success: {status.successCount}</p>
        <p className="text-red-600">Failed: {status.failCount}</p>
      </div>

      <div className="mt-4 space-x-4">
        {status.status === 'processing' && (
          <Button
            onClick={handleCancel}
            variant="destructive"
          >
            Cancel Job
          </Button>
        )}
        {status.status === 'cancelled' && (
          <Button
            onClick={handleResume}
            variant="default"
          >
            Resume Job
          </Button>
        )}
      </div>
      <Link href="/" className="mt-4 block">Back to Home</Link>
    </div>
  )
} 