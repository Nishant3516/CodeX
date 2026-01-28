import { NextResponse } from 'next/server';


export async function GET() {
  try {
    const endpointURL = `${process.env.BACKEND_API_URL}/v0/projects`;
    console.log("Fetching experimental projects from:", endpointURL);
    const response = await fetch(endpointURL, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Disable caching for dynamic data
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Fetched experimental projects data:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching experimental projects:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch languages',
        languages: []
      },
      { status: 500 }
    );
  }
}