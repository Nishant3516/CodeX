import { NextRequest, NextResponse } from 'next/server';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ language: string }> }
) {
  try {
    const {language} = await params;
    
    if (!language) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Language parameter is required',
          projects: []
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${process.env.BACKEND_API_URL}/v0/projects/${language}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Disable caching for dynamic data
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching experimental projects by language:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch projects',
        projects: []
      },
      { status: 500 }
    );
  }
}