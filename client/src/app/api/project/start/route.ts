import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { language, labId } = body || {};
    if (!language) {
      return NextResponse.json({ error: 'language is required' }, { status: 400 });
    }

    const backend = process.env.BACKEND_API_URL || 'http://localhost:8080';
 
    const url = `${backend}/v0/playground`;
    // Proxy the request to backend. Backend will generate labId and return data.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, labId })
    });
    

    const data = await res.json();
    return NextResponse.json({
      success: true,
      labId,
      ...data
    }, { status: res.status });
  } catch (err) {
    console.error('Start proxy error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
