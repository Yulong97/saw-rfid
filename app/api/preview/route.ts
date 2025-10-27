import { NextRequest, NextResponse } from 'next/server';
import { prismaMain } from '@/lib/prisma/main';
import fs from 'fs';
import path from 'path';

// Auto-generate base path from ONEDRIVE_BASE_PATH
const ONEDRIVE_BASE_PATH = process.env.ONEDRIVE_BASE_PATH || process.env.RAW_DATA_BASE_PATH || 'C:\\Users\\Yulong_Lab\\OneDrive';
const RAW_DATA_BASE_PATH = ONEDRIVE_BASE_PATH;
const RAW_DATA_RELATIVE_PATH = '001shared/saw-rfid-project/raw_data/test';
const RAW_DATA_FULL_PATH = path.join(RAW_DATA_BASE_PATH, RAW_DATA_RELATIVE_PATH);

// 支持预览的文件类型
const PREVIEWABLE_TYPES = {
  text: ['.txt', '.csv', '.json', '.xml', '.log', '.md'],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'],
  video: ['.mp4', '.avi', '.mov', '.webm'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a'],
  pdf: ['.pdf'],
  code: ['.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.html', '.py', '.java', '.cpp', '.c', '.php', '.rb', '.go', '.rs']
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('id');
    const previewType = searchParams.get('type') || 'info';

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
    const extension = path.extname(fullPath).toLowerCase();
    const fileName = record.title || path.basename(fullPath);

    // 获取文件类型
    const fileType = getFileType(extension);
    const isPreviewable = isFilePreviewable(extension);

    // 如果只是请求文件信息
    if (previewType === 'info') {
      return NextResponse.json({
        success: true,
        data: {
          id: record.id,
          fileName,
          fileSize: stats.size,
          fileType,
          extension,
          isPreviewable,
          mimeType: getMimeType(extension),
          lastModified: stats.mtime,
          createdAt: stats.birthtime,
          relativePath: record.file_path_relative,
          description: record.description,
        }
      });
    }

    // 如果请求预览内容
    if (previewType === 'content' && isPreviewable) {
      const content = await getFileContent(fullPath, fileType, extension, parseInt(recordId));
      return NextResponse.json({
        success: true,
        data: {
          fileName,
          fileType,
          extension,
          content,
          mimeType: getMimeType(extension),
        }
      });
    }

    return NextResponse.json({ error: 'Preview not supported for this file type' }, { status: 400 });

  } catch (error) {
    console.error('Error previewing file:', error);
    return NextResponse.json({ error: 'Failed to preview file' }, { status: 500 });
  }
}

// 获取文件类型
function getFileType(extension: string): string {
  for (const [type, extensions] of Object.entries(PREVIEWABLE_TYPES)) {
    if (extensions.includes(extension)) {
      return type;
    }
  }
  return 'unknown';
}

// 检查文件是否可预览
function isFilePreviewable(extension: string): boolean {
  return Object.values(PREVIEWABLE_TYPES).flat().includes(extension);
}

// 获取文件内容
async function getFileContent(filePath: string, fileType: string, extension: string, recordId: number): Promise<any> {
  try {
    switch (fileType) {
      case 'text':
      case 'code':
        // 读取文本文件内容
        const textContent = fs.readFileSync(filePath, 'utf-8');
        return {
          type: 'text',
          content: textContent,
          lines: textContent.split('\n').length,
          encoding: 'utf-8'
        };

      case 'image':
        // 对于图片，返回base64编码
        const imageBuffer = fs.readFileSync(filePath);
        const base64Image = imageBuffer.toString('base64');
        return {
          type: 'image',
          content: `data:${getMimeType(extension)};base64,${base64Image}`,
          size: imageBuffer.length
        };

      case 'json':
        // 解析JSON文件
        const jsonContent = fs.readFileSync(filePath, 'utf-8');
        const parsedJson = JSON.parse(jsonContent);
        return {
          type: 'json',
          content: parsedJson,
          raw: jsonContent,
          formatted: JSON.stringify(parsedJson, null, 2)
        };

      case 'csv':
        // 解析CSV文件
        const csvContent = fs.readFileSync(filePath, 'utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        const headers = lines[0]?.split(',') || [];
        const rows = lines.slice(1).map(line => line.split(','));
        return {
          type: 'csv',
          content: { headers, rows },
          raw: csvContent,
          totalRows: rows.length
        };

      case 'pdf':
        // 对于PDF文件，返回base64编码用于预览
        const pdfBuffer = fs.readFileSync(filePath);
        const base64Pdf = pdfBuffer.toString('base64');
        return {
          type: 'pdf',
          content: `data:${getMimeType(extension)};base64,${base64Pdf}`,
          size: pdfBuffer.length,
          fileName: path.basename(filePath)
        };

      case 'video':
        // 对于视频文件，返回流式API URL用于预览
        return {
          type: 'video',
          content: `/api/stream?id=${recordId}`,
          size: fs.statSync(filePath).size,
          fileName: path.basename(filePath),
          mimeType: getMimeType(extension)
        };

      case 'audio':
        // 对于音频文件，返回流式API URL用于预览
        return {
          type: 'audio',
          content: `/api/stream?id=${recordId}`,
          size: fs.statSync(filePath).size,
          fileName: path.basename(filePath),
          mimeType: getMimeType(extension)
        };

      default:
        return {
          type: 'unknown',
          content: null,
          message: 'File type not supported for preview'
        };
    }
  } catch (error) {
    console.error('Error reading file content:', error);
    return {
      type: 'error',
      content: null,
      error: 'Failed to read file content'
    };
  }
}

// 获取文件 MIME 类型
function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.log': 'text/plain',
    '.md': 'text/markdown',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
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
