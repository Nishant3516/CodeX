import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectID: string }> }
) {
  try {
    const { projectID } = await params;
    const apiUrl = process.env.BACKEND_API_URL;
    const finalUrl = `${apiUrl}/v0/quests/${projectID}`;
    
    const res = await fetch(finalUrl, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      return NextResponse.error();
    }
    const quest = await res.json();
    return NextResponse.json(quest);
  } catch (error) {
    return NextResponse.error();
  }
}
