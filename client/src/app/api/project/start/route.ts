import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { language } = body || {};
    if (!language) {
      return NextResponse.json({ error: 'language is required' }, { status: 400 });
    }

    const backend = process.env.BACKEND_API_URL || 'http://localhost:8080';
    const labId = `test`
    const url = `${backend}/v0/playground`;

    // Proxy the request to backend. Backend will generate labId and return data.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, labId })
    });

    if (!res.ok) {
      return NextResponse.json({ success:false, error: 'Failed to start lab' }, { status: res.status || 500 });
    }

    return NextResponse.json( {
      success:true,
      labId
    }, { status: 200 });
  } catch (err) {
    console.error('Start proxy error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
