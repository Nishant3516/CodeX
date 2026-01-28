import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ questSlug: string }> }
) {
  try {
  const { questSlug } = await params;
  const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:8080';
	
  const response = await fetch(
    `${backendUrl}/v0/quest/${questSlug}/checkpoints`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch checkpoints' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}