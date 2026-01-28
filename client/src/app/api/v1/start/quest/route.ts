import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { language, projectSlug, labId } = body || {};
    
    // Validate required fields
    if (!language) {
      return NextResponse.json(
        { success: false, error: 'Language is required' }, 
        { status: 400 }
      );
    }
    
    if (!projectSlug) {
      return NextResponse.json(
        { success: false, error: 'Project slug is required' }, 
        { status: 400 }
      );
    }

    if (!labId) {
      return NextResponse.json(
        { success: false, error: 'Lab ID is required' }, 
        { status: 400 }
      );
    }

    // Forward request to backend
    const response = await fetch(`${process.env.BACKEND_API_URL}/v0/quest/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language,
        projectSlug,
        labId,
      }),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { 
      status: response.status 
    });
  } catch (error) {
    console.error('Error starting quest:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start quest' 
      },
      { status: 500 }
    );
  }
}