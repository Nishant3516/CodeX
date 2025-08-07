import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { projectID: string } }) {
try {
     const { projectID } = await params;
     const apiUrl = process.env.API_URL
     const finalUrl = `${apiUrl}/v0/quests/${projectID}`;
     console.log(`Fetching project with ID: ${projectID} from API URL: ${finalUrl}`);
  const res = await fetch(finalUrl, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    return NextResponse.error();
  }
  console.log("RESPONSE", res)
  const quest = await res.json();
  return NextResponse.json(quest);
} catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.error();
    
}
 
}
