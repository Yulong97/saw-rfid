'use server';

import { prismaMain } from '@/lib/prisma/main';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { writeFile, readFile } from 'fs/promises';

const RAW_DATA_BASE_PATH = process.env.RAW_DATA_BASE_PATH || 'C:\\Users\\Yulong_Lab\\OneDrive';
const RAW_DATA_RELATIVE_PATH = '001shared/saw-rfid-project/raw_data/test';
const RAW_DATA_FULL_PATH = path.join(RAW_DATA_BASE_PATH, RAW_DATA_RELATIVE_PATH);

// 获取所有数据管理记录
export async function getDataManagementRecords() {
  try {
    const records = await prismaMain.data_management.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return { success: true, data: records };
  } catch (error) {
    console.error('Error fetching data management records:', error);
    return { success: false, error: 'Failed to fetch data management records' };
  }
}

// 扫描网盘目录并同步到数据库（全量同步）
export async function scanAndSyncDataFiles() {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(RAW_DATA_FULL_PATH)) {
      return { success: false, error: 'Raw data directory does not exist' };
    }

    // 读取目录中的所有文件
    const files = fs.readdirSync(RAW_DATA_FULL_PATH, { withFileTypes: true });
    const fileList = files
      .filter(file => file.isFile())
      .map(file => ({
        name: file.name,
        path: path.join(RAW_DATA_FULL_PATH, file.name),
        relativePath: `test/${file.name}`,
        stats: fs.statSync(path.join(RAW_DATA_FULL_PATH, file.name))
      }));

    // 获取数据库中所有活跃的记录
    const existingRecords = await prismaMain.data_management.findMany({
      where: {
        isActive: true,
        file_path_relative: {
          startsWith: 'test/'
        }
      },
    });

    const results = {
      created: [] as any[],
      updated: [] as any[],
      deleted: [] as any[],
      unchanged: [] as any[]
    };

    // 创建文件路径到记录的映射
    const recordMap = new Map();
    existingRecords.forEach(record => {
      if (record.file_path_relative) {
        recordMap.set(record.file_path_relative, record);
      }
    });

    // 处理磁盘上的文件
    for (const file of fileList) {
      const existingRecord = recordMap.get(file.relativePath);
      
      if (!existingRecord) {
        // 创建新记录
        const record = await prismaMain.data_management.create({
          data: {
            title: file.name,
            description: `Auto-synced file from ${file.relativePath}`,
            file_path_relative: file.relativePath,
            status: 'active',
          },
        });
        results.created.push({ action: 'created', record });
      } else {
        // 检查文件是否有变化（通过修改时间）
        const fileModified = new Date(file.stats.mtime);
        const recordModified = new Date(existingRecord.updatedAt);
        
        if (fileModified > recordModified) {
          // 文件有变化，更新记录
          const updatedRecord = await prismaMain.data_management.update({
            where: { id: existingRecord.id },
            data: {
              updatedAt: new Date(),
            },
          });
          results.updated.push({ action: 'updated', record: updatedRecord });
        } else {
          results.unchanged.push({ action: 'unchanged', record: existingRecord });
        }
        
        // 从映射中移除，剩下的就是已删除的文件
        recordMap.delete(file.relativePath);
      }
    }

    // 处理已删除的文件（软删除）
    for (const [relativePath, record] of recordMap) {
      const deletedRecord = await prismaMain.data_management.update({
        where: { id: record.id },
        data: {
          isActive: false,
          status: 'deleted',
          updatedAt: new Date(),
        },
      });
      results.deleted.push({ action: 'deleted', record: deletedRecord });
    }

    revalidatePath('/data-management');
    return { 
      success: true, 
      data: results,
      summary: {
        total: fileList.length,
        created: results.created.length,
        updated: results.updated.length,
        deleted: results.deleted.length,
        unchanged: results.unchanged.length
      }
    };
  } catch (error) {
    console.error('Error scanning and syncing data files:', error);
    return { success: false, error: 'Failed to scan and sync data files' };
  }
}

// 增量同步文件（基于时间戳）
export async function incrementalSyncDataFiles(lastSyncTime?: Date) {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(RAW_DATA_FULL_PATH)) {
      return { success: false, error: 'Raw data directory does not exist' };
    }

    // 如果没有提供上次同步时间，则进行全量同步
    if (!lastSyncTime) {
      return await scanAndSyncDataFiles();
    }

    // 读取目录中的所有文件
    const files = fs.readdirSync(RAW_DATA_FULL_PATH, { withFileTypes: true });
    const fileList = files
      .filter(file => file.isFile())
      .map(file => {
        const filePath = path.join(RAW_DATA_FULL_PATH, file.name);
        const stats = fs.statSync(filePath);
        return {
          name: file.name,
          path: filePath,
          relativePath: `test/${file.name}`,
          stats: stats,
          modified: new Date(stats.mtime)
        };
      })
      .filter(file => file.modified > lastSyncTime); // 只处理修改时间晚于上次同步的文件

    const results = {
      created: [] as any[],
      updated: [] as any[],
      deleted: [] as any[]
    };

    // 处理修改过的文件
    for (const file of fileList) {
      const existingRecord = await prismaMain.data_management.findFirst({
        where: {
          file_path_relative: file.relativePath,
        },
      });

      if (!existingRecord) {
        // 创建新记录
        const record = await prismaMain.data_management.create({
          data: {
            title: file.name,
            description: `Auto-synced file from ${file.relativePath}`,
            file_path_relative: file.relativePath,
            status: 'active',
          },
        });
        results.created.push({ action: 'created', record });
      } else {
        // 更新现有记录
        const updatedRecord = await prismaMain.data_management.update({
          where: { id: existingRecord.id },
          data: {
            updatedAt: new Date(),
            isActive: true,
            status: 'active',
          },
        });
        results.updated.push({ action: 'updated', record: updatedRecord });
      }
    }

    // 检查是否有文件被删除（通过比较数据库记录和磁盘文件）
    const allRecords = await prismaMain.data_management.findMany({
      where: {
        isActive: true,
        file_path_relative: {
          startsWith: 'test/'
        },
        updatedAt: {
          gte: lastSyncTime
        }
      },
    });

    for (const record of allRecords) {
      if (record.file_path_relative) {
        const fullPath = path.join(RAW_DATA_FULL_PATH, record.file_path_relative.replace('test/', ''));
        if (!fs.existsSync(fullPath)) {
          const deletedRecord = await prismaMain.data_management.update({
            where: { id: record.id },
            data: {
              isActive: false,
              status: 'deleted',
              updatedAt: new Date(),
            },
          });
          results.deleted.push({ action: 'deleted', record: deletedRecord });
        }
      }
    }

    revalidatePath('/data-management');
    return { 
      success: true, 
      data: results,
      summary: {
        total: fileList.length,
        created: results.created.length,
        updated: results.updated.length,
        deleted: results.deleted.length
      }
    };
  } catch (error) {
    console.error('Error incremental syncing data files:', error);
    return { success: false, error: 'Failed to incremental sync data files' };
  }
}

// 创建数据管理记录
export async function createDataManagementRecord(data: {
  title: string;
  description?: string;
  file_path_relative?: string;
  status?: string;
}) {
  try {
    const record = await prismaMain.data_management.create({
      data: {
        title: data.title,
        description: data.description,
        file_path_relative: data.file_path_relative,
        status: data.status || 'active',
      },
    });
    revalidatePath('/data-management');
    return { success: true, data: record };
  } catch (error) {
    console.error('Error creating data management record:', error);
    return { success: false, error: 'Failed to create data management record' };
  }
}

// 更新数据管理记录
export async function updateDataManagementRecord(id: number, data: {
  title?: string;
  description?: string;
  file_path_relative?: string;
  status?: string;
}) {
  try {
    const record = await prismaMain.data_management.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
    revalidatePath('/data-management');
    return { success: true, data: record };
  } catch (error) {
    console.error('Error updating data management record:', error);
    return { success: false, error: 'Failed to update data management record' };
  }
}

// 删除数据管理记录（软删除）
export async function deleteDataManagementRecord(id: number) {
  try {
    const record = await prismaMain.data_management.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
    revalidatePath('/data-management');
    return { success: true, data: record };
  } catch (error) {
    console.error('Error deleting data management record:', error);
    return { success: false, error: 'Failed to delete data management record' };
  }
}

// 获取文件信息
export async function getFileInfo(relativePath: string) {
  try {
    const fullPath = path.join(RAW_DATA_FULL_PATH, relativePath);
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'File does not exist' };
    }

    const stats = fs.statSync(fullPath);
    return {
      success: true,
      data: {
        path: fullPath,
        relativePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      },
    };
  } catch (error) {
    console.error('Error getting file info:', error);
    return { success: false, error: 'Failed to get file info' };
  }
}

// 上传文件并创建记录
export async function uploadFile(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // 确保目录存在
    if (!fs.existsSync(RAW_DATA_FULL_PATH)) {
      fs.mkdirSync(RAW_DATA_FULL_PATH, { recursive: true });
    }

    // 生成文件名（避免重复）
    const timestamp = Date.now();
    const originalName = file.name;
    const fileExtension = path.extname(originalName);
    const baseName = path.basename(originalName, fileExtension);
    const fileName = `${baseName}_${timestamp}${fileExtension}`;
    
    // 构建文件路径
    const relativePath = `test/${fileName}`;
    const fullPath = path.join(RAW_DATA_FULL_PATH, fileName);

    // 将文件写入磁盘
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(fullPath, buffer);

    // 在数据库中创建记录
    const record = await prismaMain.data_management.create({
      data: {
        title: title || originalName,
        description: description || `Uploaded file: ${originalName}`,
        file_path_relative: relativePath,
        status: 'active',
      },
    });

    revalidatePath('/data-management');
    return { 
      success: true, 
      data: {
        record,
        fileName,
        fileSize: file.size,
        fileType: file.type,
      }
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { success: false, error: 'Failed to upload file' };
  }
}

// 批量上传文件
export async function uploadMultipleFiles(formData: FormData) {
  try {
    const files = formData.getAll('files') as File[];
    const results = [];

    if (!files || files.length === 0) {
      return { success: false, error: 'No files provided' };
    }

    // 确保目录存在
    if (!fs.existsSync(RAW_DATA_FULL_PATH)) {
      fs.mkdirSync(RAW_DATA_FULL_PATH, { recursive: true });
    }

    for (const file of files) {
      try {
        // 生成文件名（避免重复）
        const timestamp = Date.now() + Math.random() * 1000;
        const originalName = file.name;
        const fileExtension = path.extname(originalName);
        const baseName = path.basename(originalName, fileExtension);
        const fileName = `${baseName}_${timestamp}${fileExtension}`;
        
        // 构建文件路径
        const relativePath = `test/${fileName}`;
        const fullPath = path.join(RAW_DATA_FULL_PATH, fileName);

        // 将文件写入磁盘
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(fullPath, buffer);

        // 在数据库中创建记录
        const record = await prismaMain.data_management.create({
          data: {
            title: originalName,
            description: `Uploaded file: ${originalName}`,
            file_path_relative: relativePath,
            status: 'active',
          },
        });

        results.push({
          success: true,
          fileName,
          originalName,
          fileSize: file.size,
          fileType: file.type,
          record,
        });
      } catch (fileError) {
        console.error(`Error uploading file ${file.name}:`, fileError);
        results.push({
          success: false,
          fileName: file.name,
          error: `Failed to upload ${file.name}`,
        });
      }
    }

    revalidatePath('/data-management');
    return { 
      success: true, 
      data: results,
      summary: {
        total: files.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      }
    };
  } catch (error) {
    console.error('Error uploading multiple files:', error);
    return { success: false, error: 'Failed to upload files' };
  }
}

// 下载文件 - 返回文件信息而不是文件内容
export async function downloadFile(recordId: number) {
  try {
    // 获取记录信息
    const record = await prismaMain.data_management.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      return { success: false, error: 'Record not found' };
    }

    if (!record.file_path_relative) {
      return { success: false, error: 'No file path associated with this record' };
    }

    // 构建完整文件路径
    const fullPath = path.join(RAW_DATA_FULL_PATH, record.file_path_relative.replace('test/', ''));
    
    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'File does not exist on disk' };
    }

    const stats = fs.statSync(fullPath);

    return {
      success: true,
      data: {
        fileName: record.title || path.basename(fullPath),
        fileSize: stats.size,
        mimeType: getMimeType(path.extname(fullPath)),
        lastModified: stats.mtime,
        relativePath: record.file_path_relative,
      },
    };
  } catch (error) {
    console.error('Error downloading file:', error);
    return { success: false, error: 'Failed to download file' };
  }
}

// 获取文件 MIME 类型
function getMimeType(extension: string): string {
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

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

// 批量下载文件 - 返回文件信息列表
export async function downloadMultipleFiles(recordIds: number[]) {
  try {
    const records = await prismaMain.data_management.findMany({
      where: {
        id: { in: recordIds },
        isActive: true,
      },
    });

    if (records.length === 0) {
      return { success: false, error: 'No valid records found' };
    }

    const files = [];
    const missingFiles = [];

    for (const record of records) {
      if (!record.file_path_relative) {
        missingFiles.push(record.title || `Record ${record.id}`);
        continue;
      }

      const fullPath = path.join(RAW_DATA_FULL_PATH, record.file_path_relative.replace('test/', ''));
      
      if (!fs.existsSync(fullPath)) {
        missingFiles.push(record.title || `Record ${record.id}`);
        continue;
      }

      try {
        const stats = fs.statSync(fullPath);
        files.push({
          id: record.id,
          name: record.title || path.basename(fullPath),
          size: stats.size,
          mimeType: getMimeType(path.extname(fullPath)),
          relativePath: record.file_path_relative,
        });
      } catch (error) {
        missingFiles.push(record.title || `Record ${record.id}`);
      }
    }

    if (files.length === 0) {
      return { success: false, error: 'No files could be downloaded' };
    }

    return {
      success: true,
      data: {
        files: files,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        isSingleFile: files.length === 1,
      },
      missingFiles,
    };
  } catch (error) {
    console.error('Error downloading multiple files:', error);
    return { success: false, error: 'Failed to download files' };
  }
}

// 获取文件下载链接（用于直接下载）
export async function getFileDownloadUrl(recordId: number) {
  try {
    const record = await prismaMain.data_management.findUnique({
      where: { id: recordId },
    });

    if (!record || !record.file_path_relative) {
      return { success: false, error: 'Record or file path not found' };
    }

    const fullPath = path.join(RAW_DATA_FULL_PATH, record.file_path_relative.replace('test/', ''));
    
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'File does not exist' };
    }

    // 返回文件路径，前端可以直接使用
    return {
      success: true,
      data: {
        filePath: fullPath,
        fileName: record.title || path.basename(fullPath),
        relativePath: record.file_path_relative,
      },
    };
  } catch (error) {
    console.error('Error getting file download URL:', error);
    return { success: false, error: 'Failed to get download URL' };
  }
}

// 获取文件预览信息
export async function getFilePreviewInfo(recordId: number) {
  try {
    const record = await prismaMain.data_management.findUnique({
      where: { id: recordId },
    });

    if (!record || !record.file_path_relative) {
      return { success: false, error: 'Record or file path not found' };
    }

    const fullPath = path.join(RAW_DATA_FULL_PATH, record.file_path_relative.replace('test/', ''));
    
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'File does not exist' };
    }

    const stats = fs.statSync(fullPath);
    const extension = path.extname(fullPath).toLowerCase();
    const fileName = record.title || path.basename(fullPath);

    // 支持预览的文件类型
    const PREVIEWABLE_TYPES = {
      text: ['.txt', '.csv', '.json', '.xml', '.log', '.md'],
      image: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'],
      video: ['.mp4', '.avi', '.mov', '.webm'],
      audio: ['.mp3', '.wav', '.ogg', '.m4a'],
      pdf: ['.pdf'],
      code: ['.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.html', '.py', '.java', '.cpp', '.c', '.php', '.rb', '.go', '.rs']
    };

    // 获取文件类型
    let fileType = 'unknown';
    for (const [type, extensions] of Object.entries(PREVIEWABLE_TYPES)) {
      if (extensions.includes(extension)) {
        fileType = type;
        break;
      }
    }

    const isPreviewable = Object.values(PREVIEWABLE_TYPES).flat().includes(extension);

    return {
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
    };
  } catch (error) {
    console.error('Error getting file preview info:', error);
    return { success: false, error: 'Failed to get file preview info' };
  }
}

// 获取文件预览内容
export async function getFilePreviewContent(recordId: number) {
  try {
    const record = await prismaMain.data_management.findUnique({
      where: { id: recordId },
    });

    if (!record || !record.file_path_relative) {
      return { success: false, error: 'Record or file path not found' };
    }

    const fullPath = path.join(RAW_DATA_FULL_PATH, record.file_path_relative.replace('test/', ''));
    
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'File does not exist' };
    }

    const extension = path.extname(fullPath).toLowerCase();
    const fileName = record.title || path.basename(fullPath);

    // 支持预览的文件类型
    const PREVIEWABLE_TYPES = {
      text: ['.txt', '.csv', '.json', '.xml', '.log', '.md'],
      image: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'],
      video: ['.mp4', '.avi', '.mov', '.webm'],
      audio: ['.mp3', '.wav', '.ogg', '.m4a'],
      pdf: ['.pdf'],
      code: ['.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.html', '.py', '.java', '.cpp', '.c', '.php', '.rb', '.go', '.rs']
    };

    // 获取文件类型
    let fileType = 'unknown';
    for (const [type, extensions] of Object.entries(PREVIEWABLE_TYPES)) {
      if (extensions.includes(extension)) {
        fileType = type;
        break;
      }
    }

    const isPreviewable = Object.values(PREVIEWABLE_TYPES).flat().includes(extension);

    if (!isPreviewable) {
      return { success: false, error: 'File type not supported for preview' };
    }

    // 获取文件内容
    const content = await getFileContentForPreview(fullPath, fileType, extension, recordId);

    return {
      success: true,
      data: {
        fileName,
        fileType,
        extension,
        content,
        mimeType: getMimeType(extension),
      }
    };
  } catch (error) {
    console.error('Error getting file preview content:', error);
    return { success: false, error: 'Failed to get file preview content' };
  }
}

// 获取文件内容用于预览
async function getFileContentForPreview(filePath: string, fileType: string, extension: string, recordId: number): Promise<any> {
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