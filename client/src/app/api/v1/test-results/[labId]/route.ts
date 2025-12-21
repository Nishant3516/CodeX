import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ labId: string }> }
) {
  try {
  const { labId } = await params;
  const backendUrl = process.env.BACKEND_API_URL ?? 'http://localhost:8080';
    
    const response = await fetch(
      `${backendUrl}/v1/test-results/${labId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch test results' },
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