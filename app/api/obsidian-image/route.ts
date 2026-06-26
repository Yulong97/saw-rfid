import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const OBSIDIAN_BASE_PATH = process.env.OBSIDIAN_BASE_PATH || 
  'C:\\Users\\Yulong_Lab\\OneDrive\\obsidian\\Obsidian_Yulong';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get('path');
    
    if (!imagePath) {
      return new NextResponse('Missing image path', { status: 400 });
    }

    // 解码路径
    const decodedPath = decodeURIComponent(imagePath);
    
    // 处理相对路径和绝对路径
    let normalizedPath = decodedPath;
    
    // 如果路径以 / 开头，去掉开头的斜杠
    if (normalizedPath.startsWith('/')) {
      normalizedPath = normalizedPath.substring(1);
    }
    
    // 构建完整的文件路径
    const fullPath = path.join(OBSIDIAN_BASE_PATH, normalizedPath);
    
    // 尝试多个可能的路径
    const possiblePaths = [
      fullPath,
      // 如果路径不包含文件夹分隔符，尝试在assets文件夹中查找
      ...(decodedPath.includes('/') ? [] : [
        path.join(OBSIDIAN_BASE_PATH, 'assets', decodedPath),
      ]),
      path.join(OBSIDIAN_BASE_PATH, 'attachments', decodedPath),
      path.join(OBSIDIAN_BASE_PATH, 'images', decodedPath),
      path.join(OBSIDIAN_BASE_PATH, 'media', decodedPath),
    ];

    let resolvedPath = '';
    let foundPath = '';

    // 查找存在的文件
    for (const possiblePath of possiblePaths) {
      const resolved = path.resolve(possiblePath);
      const obsidianPath = path.resolve(OBSIDIAN_BASE_PATH);
      
      // 安全检查：确保路径在 Obsidian 目录内
      if (resolved.startsWith(obsidianPath) && fs.existsSync(resolved)) {
        resolvedPath = resolved;
        foundPath = possiblePath;
        break;
      }
    }

    if (!resolvedPath) {
      return new NextResponse('Image not found', { status: 404 });
    }

    // 读取文件
    const fileBuffer = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    
    // 根据文件扩展名设置正确的 MIME 类型
    let mimeType = 'application/octet-stream';
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        mimeType = 'image/jpeg';
        break;
      case '.png':
        mimeType = 'image/png';
        break;
      case '.gif':
        mimeType = 'image/gif';
        break;
      case '.webp':
        mimeType = 'image/webp';
        break;
      case '.svg':
        mimeType = 'image/svg+xml';
        break;
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
