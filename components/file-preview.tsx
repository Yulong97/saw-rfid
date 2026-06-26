'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  FileText, 
  Image, 
  Video, 
  Music, 
  Code, 
  Download, 
  X,
  Loader2,
  AlertCircle,
  FileIcon,
  Maximize2,
  ExternalLink,
  PenTool,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const DxfPreview = dynamic(() => import('@/components/dxf-preview'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ),
});

interface FilePreviewProps {
  recordId: number;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface FileInfo {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  extension: string;
  isPreviewable: boolean;
  mimeType: string;
  lastModified: string;
  createdAt: string;
  relativePath: string;
  description: string | null;
}

interface FileContent {
  fileName: string;
  fileType: string;
  extension: string;
  content: any;
  mimeType: string;
}

export default function FilePreview({ recordId, fileName, isOpen, onClose }: FilePreviewProps) {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // 获取文件信息
  const fetchFileInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/preview?id=${recordId}&type=info`);
      const result = await response.json();
      
      if (result.success) {
        setFileInfo(result.data);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('获取文件信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取文件内容
  const fetchFileContent = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/preview?id=${recordId}&type=content`);
      const result = await response.json();
      
      if (result.success) {
        setFileContent(result.data);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('获取文件内容失败');
    } finally {
      setLoading(false);
    }
  };

  // 下载文件
  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/download?id=${recordId}`);
      
      if (response.ok) {
        const contentDisposition = response.headers.get('content-disposition');
        const downloadFileName = contentDisposition 
          ? decodeURIComponent(contentDisposition.split('filename=')[1]?.replace(/"/g, '') || fileName)
          : fileName;
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = downloadFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success(`文件 "${downloadFileName}" 下载成功`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || '下载失败');
      }
    } catch (error) {
      toast.error('下载失败');
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取文件类型图标
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'text':
      case 'csv':
        return <FileText className="h-6 w-6" />;
      case 'image':
        return <Image className="h-6 w-6" />;
      case 'video':
        return <Video className="h-6 w-6" />;
      case 'audio':
        return <Music className="h-6 w-6" />;
      case 'code':
        return <Code className="h-6 w-6" />;
      case 'pdf':
        return <FileText className="h-6 w-6" />;
      case 'dxf':
        return <PenTool className="h-6 w-6" />;
      default:
        return <FileIcon className="h-6 w-6" />;
    }
  };

  // 渲染文件内容
  const renderFileContent = () => {
    if (!fileContent) return null;

    switch (fileContent.fileType) {
      case 'text':
      case 'code':
        return (
          <ScrollArea className="h-96 w-full">
            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded">
              {fileContent.content.content}
            </pre>
          </ScrollArea>
        );

      case 'json':
        return (
          <Tabs defaultValue="formatted" className="w-full">
            <TabsList>
              <TabsTrigger value="formatted">格式化</TabsTrigger>
              <TabsTrigger value="raw">原始</TabsTrigger>
            </TabsList>
            <TabsContent value="formatted">
              <ScrollArea className="h-96 w-full">
                <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded">
                  {fileContent.content.formatted}
                </pre>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="raw">
              <ScrollArea className="h-96 w-full">
                <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded">
                  {fileContent.content.raw}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        );

      case 'csv':
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              共 {fileContent.content.totalRows} 行数据
            </div>
            <ScrollArea className="h-96 w-full">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted">
                      {fileContent.content.headers.map((header: string, index: number) => (
                        <th key={index} className="border border-border p-2 text-left text-sm font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fileContent.content.rows.slice(0, 100).map((row: string[], rowIndex: number) => (
                      <tr key={rowIndex}>
                        {row.map((cell: string, cellIndex: number) => (
                          <td key={cellIndex} className="border border-border p-2 text-sm">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {fileContent.content.rows.length > 100 && (
                  <div className="text-center text-sm text-muted-foreground p-4">
                    仅显示前100行数据...
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );

      case 'image':
        return (
          <div className="flex justify-center">
            <img 
              src={fileContent.content.content} 
              alt={fileContent.fileName}
              className="max-w-full max-h-[70vh] object-contain rounded border"
            />
          </div>
        );

      case 'pdf':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>PDF Preview ({formatFileSize(fileContent.content.size)})</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/data-management/view?id=${recordId}`} target="_blank">
                    <Maximize2 className="h-4 w-4 mr-1" />
                    Full Screen
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={fileContent.content.content} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    New Tab
                  </a>
                </Button>
              </div>
            </div>
            <iframe
              src={fileContent.content.content}
              className="w-full min-h-[70vh] border rounded bg-muted"
              title={fileContent.fileName}
            />
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              视频文件预览 (大小: {formatFileSize(fileContent.content.size)})
            </div>
            <div className="flex justify-center">
              <video
                src={fileContent.content.content}
                controls
                preload="metadata"
                className="max-w-full max-h-96 rounded border"
                title={fileContent.fileName}
                onError={(e) => {
                  console.error('Video playback error:', e);
                  toast.error('视频播放失败，请尝试下载文件');
                }}
                onLoadStart={() => {
                  console.log('Video loading started');
                }}
                onCanPlay={() => {
                  console.log('Video can start playing');
                }}
              >
                您的浏览器不支持视频播放
              </video>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              支持格式: MP4, AVI, MOV, WebM | 支持进度条拖动和音量控制
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              音频文件预览 (大小: {formatFileSize(fileContent.content.size)})
            </div>
            <div className="flex justify-center">
              <audio
                src={fileContent.content.content}
                controls
                preload="metadata"
                className="w-full max-w-md"
                title={fileContent.fileName}
                onError={(e) => {
                  console.error('Audio playback error:', e);
                  toast.error('音频播放失败，请尝试下载文件');
                }}
              >
                您的浏览器不支持音频播放
              </audio>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              支持格式: MP3, WAV, OGG, M4A | 支持进度条拖动和音量控制
            </div>
          </div>
        );

      case 'dxf':
        return (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              DXF Preview ({formatFileSize(fileContent.content.size)})
            </div>
            <DxfPreview
              streamUrl={fileContent.content.content}
              fileName={fileContent.fileName}
            />
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mr-2" />
            此文件类型不支持预览
          </div>
        );
    }
  };

  useEffect(() => {
    if (isOpen && recordId) {
      setFileInfo(null);
      setFileContent(null);
      setActiveTab('info');
      fetchFileInfo();
    }
  }, [isOpen, recordId]);

  useEffect(() => {
    if (fileInfo?.fileType === 'pdf' && fileInfo.isPreviewable) {
      setActiveTab('content');
    }
    if (
      (fileInfo?.fileType === 'image' ||
        fileInfo?.fileType === 'video' ||
        fileInfo?.fileType === 'dxf') &&
      fileInfo.isPreviewable
    ) {
      setActiveTab('content');
    }
  }, [fileInfo]);

  useEffect(() => {
    if (activeTab === 'content' && fileInfo?.isPreviewable && !fileContent) {
      if (
        fileInfo.fileType === 'pdf' ||
        fileInfo.fileType === 'image' ||
        fileInfo.fileType === 'video' ||
        fileInfo.fileType === 'dxf'
      ) {
        setFileContent({
          fileName: fileInfo.fileName,
          fileType: fileInfo.fileType,
          extension: fileInfo.extension,
          content: {
            type: fileInfo.fileType,
            content: `/api/stream?id=${recordId}`,
            size: fileInfo.fileSize,
            fileName: fileInfo.fileName,
            mimeType: fileInfo.mimeType,
          },
          mimeType: fileInfo.mimeType,
        });
        return;
      }
      fetchFileContent();
    }
  }, [activeTab, fileInfo, fileContent, recordId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={
        fileInfo?.fileType === 'pdf' ||
        fileInfo?.fileType === 'image' ||
        fileInfo?.fileType === 'video' ||
        fileInfo?.fileType === 'dxf'
          ? 'max-w-6xl max-h-[95vh]'
          : 'max-w-4xl max-h-[90vh]'
      }>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {fileInfo && getFileIcon(fileInfo.fileType)}
            {fileName}
          </DialogTitle>
          <DialogDescription>
            文件预览和详细信息
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">加载中...</span>
          </div>
        )}

        {fileInfo && !loading && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">文件信息</TabsTrigger>
              <TabsTrigger value="content" disabled={!fileInfo.isPreviewable}>
                内容预览
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">基本信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">文件名:</span>
                      <p className="text-sm text-muted-foreground">{fileInfo.fileName}</p>
                    </div>
                    <div>
                      <span className="font-medium">文件大小:</span>
                      <p className="text-sm text-muted-foreground">{formatFileSize(fileInfo.fileSize)}</p>
                    </div>
                    <div>
                      <span className="font-medium">文件类型:</span>
                      <p className="text-sm text-muted-foreground">{fileInfo.fileType}</p>
                    </div>
                    <div>
                      <span className="font-medium">扩展名:</span>
                      <p className="text-sm text-muted-foreground">{fileInfo.extension}</p>
                    </div>
                    <div>
                      <span className="font-medium">MIME类型:</span>
                      <p className="text-sm text-muted-foreground">{fileInfo.mimeType}</p>
                    </div>
                    <div>
                      <span className="font-medium">是否可预览:</span>
                      <Badge variant={fileInfo.isPreviewable ? 'default' : 'secondary'}>
                        {fileInfo.isPreviewable ? '是' : '否'}
                      </Badge>
                    </div>
                  </div>
                  
                  {fileInfo.description && (
                    <div>
                      <span className="font-medium">描述:</span>
                      <p className="text-sm text-muted-foreground mt-1">{fileInfo.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">创建时间:</span>
                      <p className="text-sm text-muted-foreground">
                        {new Date(fileInfo.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">修改时间:</span>
                      <p className="text-sm text-muted-foreground">
                        {new Date(fileInfo.lastModified).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="font-medium">文件路径:</span>
                    <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded mt-1">
                      {fileInfo.relativePath}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              {fileContent ? (
                fileContent.fileType === 'dxf' ? (
                  renderFileContent()
                ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">内容预览</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderFileContent()}
                  </CardContent>
                </Card>
                )
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mr-2" />
                  此文件类型不支持预览
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            关闭
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            下载文件
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
