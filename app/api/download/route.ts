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

    // 读取文件内容
    const fileBuffer = fs.readFileSync(fullPath);
    const stats = fs.statSync(fullPath);

    // 获取文件扩展名来确定 MIME 类型
    const extension = path.extname(fullPath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
    };

    const mimeType = mimeTypes[extension] || 'application/octet-stream';
    const fileName = record.title || path.basename(fullPath);

    // 返回文件内容
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
