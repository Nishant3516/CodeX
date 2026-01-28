import { NextResponse } from 'next/server'
import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ labId: string }> }
) {
  try {
    const { labId } = await params
    if (!labId) {
      return NextResponse.json({ error: 'labId is required' }, { status: 400 })
    }
    // Create Redis client
    const client = createClient({ url: REDIS_URL })

    try {
      await client.connect()

      // Get lab instance from Redis hash map
      const labData = await client.hGet('lab_instances', labId)

      if (!labData) {
        return NextResponse.json({
          exists: false,
          message: 'Lab not found'
        }, { status: 404 })
      }

      // Parse the lab instance
      const labInstance = JSON.parse(labData)

      // Get the latest progress logs
      const progressLogs = labInstance.progressLogs || labInstance.ProgressLogs || []
      
      // Get test results and active checkpoint
      const testResults = labInstance.testResults  || labInstance.TestResults || []
      const activeCheckpoint = labInstance.activeCheckpoint || labInstance.ActiveCheckpoint || 1

      // Get the current status
      const currentStatus = labInstance.status ||  labInstance.Status || 'unknown'
      return NextResponse.json({
        exists: true,
        labId,
        status: currentStatus,
        lastUpdated: labInstance.lastUpdatedAt || labInstance.LastUpdatedAt || 0,
        createdAt: labInstance.createdAt || labInstance.CreatedAt || 0,
        progressLogs,
        language: labInstance.language || labInstance.Language || 'unknown',
        testResults,
        activeCheckpoint
      })

    } catch (redisError) {
      console.error('Redis error:', redisError)
      return NextResponse.json({ error: 'Redis connection failed' }, { status: 500 })
    } finally {
      await client.destroy()
    }

  } catch (err) {
    console.error('Progress API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
