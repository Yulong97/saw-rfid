import { NextRequest, NextResponse } from 'next/server';
import { prismaMain } from '@/lib/prisma/main';
import fs from 'fs';
import path from 'path';

const RAW_DATA_BASE_PATH = process.env.RAW_DATA_BASE_PATH || 'C:\\Users\\Yulong_Lab\\OneDrive';
const RAW_DATA_RELATIVE_PATH = '001shared/saw-rfid-project/raw_data/test';
const RAW_DATA_FULL_PATH = path.join(RAW_DATA_BASE_PATH, RAW_DATA_RELATIVE_PATH);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('id');

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    // 获取记录信息
    const record = await prismaMain.data_management.findUnique({
      where: { id: parseInt(recordId) },
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (!record.file_path_relative) {
      return NextResponse.json({ error: 'No file path associated with this record' }, { status: 404 });
    }

    // 构建完整文件路径
    const fullPath = path.join(RAW_DATA_FULL_PATH, record.file_path_relative.replace('test/', ''));
    
    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File does not exist on disk' }, { status: 404 });
    }

    const stats = fs.statSync(fullPath);
    const fileSize = stats.size;
    const fileName = record.title || path.basename(fullPath);

    // 获取Range请求头
    const range = request.headers.get('range');
    
    if (range) {
      // 处理Range请求（用于视频seek）
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      // 创建文件流
      const file = fs.createReadStream(fullPath, { start, end });
      
      // 设置响应头
      const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': getMimeType(path.extname(fullPath)),
        'Cache-Control': 'public, max-age=31536000',
      };

      return new NextResponse(file as any, {
        status: 206, // Partial Content
        headers,
      });
    } else {
      // 没有Range请求，返回完整文件
      const fileBuffer = fs.readFileSync(fullPath);
      const mimeType = getMimeType(path.extname(fullPath));

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }
  } catch (error) {
    console.error('Error streaming file:', error);
    return NextResponse.json({ error: 'Failed to stream file' }, { status: 500 });
  }
}

// 获取文件 MIME 类型
function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.log': 'text/plain',
    '.md': 'text/markdown',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.jsx': 'application/javascript',
    '.tsx': 'application/typescript',
    '.css': 'text/css',
    '.scss': 'text/scss',
    '.html': 'text/html',
    '.py': 'text/x-python',
    '.java': 'text/x-java-source',
    '.cpp': 'text/x-c++src',
    '.c': 'text/x-csrc',
    '.php': 'application/x-httpd-php',
    '.rb': 'application/x-ruby',
    '.go': 'text/x-go',
    '.rs': 'text/x-rust',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}
