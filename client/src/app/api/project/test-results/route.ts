import { NextResponse } from 'next/server'
import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { labId, checkpointId, testResult } = body

    if (!labId || !checkpointId || !testResult) {
      return NextResponse.json({ 
        error: 'labId, checkpointId, and testResult are required' 
      }, { status: 400 })
    }

    // Create Redis client
    const client = createClient({ url: REDIS_URL })

    try {
      await client.connect()

      // Get lab instance from Redis hash map
      const labData = await client.hGet('lab_instances', labId)

      if (!labData) {
        return NextResponse.json({
          error: 'Lab not found'
        }, { status: 404 })
      }

      // Parse the lab instance
      const labInstance = JSON.parse(labData)

      // Initialize TestResults if it doesn't exist
      if (!labInstance.TestResults) {
        labInstance.TestResults = {}
      }

      // Update test results for this checkpoint
      labInstance.TestResults[checkpointId] = {
        ...testResult,
        timestamp: Date.now()
      }

      // Update active checkpoint
      labInstance.ActiveCheckpoint = checkpointId

      // Update LastUpdatedAt
      labInstance.LastUpdatedAt = Math.floor(Date.now() / 1000)

      // Save back to Redis
      await client.hSet('lab_instances', labId, JSON.stringify(labInstance))

      return NextResponse.json({
        success: true,
        labId,
        checkpointId,
        testResults: labInstance.TestResults,
        activeCheckpoint: labInstance.ActiveCheckpoint
      })

    } catch (redisError) {
      console.error('Redis error:', redisError)
      return NextResponse.json({ error: 'Redis connection failed' }, { status: 500 })
    } finally {
      await client.disconnect()
    }

  } catch (err) {
    console.error('Update test results API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
