import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ labId: string }> }
) {
  try {
    const { labId } = await params;
    
    if (!labId) {
      return NextResponse.json(
        { error: 'labId is required' },
        { status: 400 }
      );
    }

    // Create Redis client
    const client = createClient({ url: REDIS_URL });

    try {
      await client.connect();

      // Get lab instance from Redis hash map
      const labData = await client.hGet('lab_instances', labId);

      if (!labData) {
        return NextResponse.json(
          { error: 'Lab not found', testResults: [], activeCheckpoint: null },
          { status: 404 }
        );
      }

      // Parse the lab instance
      const labInstance = JSON.parse(labData);

      // Get test results and active checkpoint
      const testResults = labInstance.testResults ?? labInstance.TestResults ?? [];
      const activeCheckpoint = labInstance.activeCheckpoint ?? labInstance.ActiveCheckpoint ?? 1;

      return NextResponse.json({
        testResults,
        activeCheckpoint,
        language: labInstance.language || labInstance.Language || 'unknown',
        status: labInstance.status || labInstance.Status || 'unknown'
      });

    } catch (redisError) {
      console.error('Redis error:', redisError);
      return NextResponse.json(
        { error: 'Redis connection failed', testResults: [], activeCheckpoint: null },
        { status: 500 }
      );
    } finally {
      await client.destroy();
    }
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}