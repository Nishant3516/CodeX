import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ questSlug: string }> }
) {
  try {
    const { questSlug } = await   params;
    
    if (!questSlug) {
      return NextResponse.json(
        { error: 'Quest slug is required' },
        { status: 400 }
      );
    }

    // Get the backend URL from environment variables
    const backendUrl =  process.env.BACKEND_API_URL || 'http://localhost:8080';
    
    // Forward the request to the Go backend
    const backendResponse = await fetch(
      `${backendUrl}/v0/quest/${questSlug}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Forward any auth headers if present
          ...(request.headers.get('authorization') && {
            'Authorization': request.headers.get('authorization')!
          }),
        },
      }
    );

    if (!backendResponse.ok) {
      console.error(`Backend request failed: ${backendResponse.status} ${backendResponse.statusText}`);
      
      if (backendResponse.status === 404) {
        return NextResponse.json(
          { error: 'Quest not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch quest metadata' },
        { status: backendResponse.status }
      );
    }

    const questData = await backendResponse.json();
    
    // Return the quest metadata
    return NextResponse.json(questData);
    
  } catch (error) {
    console.error('Error fetching quest metadata:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}