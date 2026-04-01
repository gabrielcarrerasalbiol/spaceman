import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user) {
      console.error('Upload attempted without authentication');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('=== UPLOAD START ===');
    console.log('Authenticated user:', session.user.email);

    const formData = await request.formData();
    console.log('FormData received');

    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    console.log('File info:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      typeParam: type
    });

    if (!file) {
      console.error('No file in formData');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PNG, JPEG, GIF, WebP, or SVG' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('File too large:', file.size);
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // For Vercel serverless, use /tmp directory
    const uploadDir = '/tmp/uploads';
    console.log('Upload directory:', uploadDir);

    if (!existsSync(uploadDir)) {
      console.log('Creating upload directory...');
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${originalName}`;
    const filepath = path.join(uploadDir, filename);

    console.log('Saving file:', filepath);

    // Convert file to buffer and write to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    console.log('File saved successfully:', filename);

    // For Vercel, return a base64 data URL instead of a file path
    const base64 = buffer.toString('base64');
    const mimeType = file.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log('Upload complete (data URL)');

    return NextResponse.json({
      url: dataUrl,
      filename,
      mimeType,
      size: file.size
    });
  } catch (error) {
    console.error('=== UPLOAD ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', (error as Error).stack);
    console.error('====================');

    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
