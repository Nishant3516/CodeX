import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const config = {
  api: {
    bodyParser: false,
  },
};

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;
    const projectName = formData.get("projectName") as string | null;
    const fileType = formData.get("fileType") as string | null; // 'boilerplate' or 'testcase'

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!projectName || projectName.trim() === "") {
      return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const originalName = (file as File).name || "file";

    const sanitizedProjectName = projectName.trim().toLowerCase().replace(/\s+/g, '-');
    
    let s3Key: string;
    if (fileType === 'boilerplate') {
      // For boilerplate zip file
      s3Key = `projects/${sanitizedProjectName}/boilerplate.zip`;
    } else {
      // For test cases
      const newFileName = `${sanitizedProjectName}}-${originalName}`;
      s3Key = `projects/${sanitizedProjectName}/test-cases/${newFileName}`;
    }

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

   
    
    return NextResponse.json({ url:s3Key });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
