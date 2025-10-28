'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getNoteByPath, type ObsidianNote } from '@/actions/main/obsidian-actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Clock, 
  Hash, 
  HardDrive, 
  FileText,
  RefreshCw,
  ExternalLink,
  Copy
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function NoteDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [note, setNote] = useState<ObsidianNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // 解码路径参数
  const notePath = decodeURIComponent(params.path as string);

  // 加载笔记详情
  const loadNote = async () => {
    setLoading(true);
    
    try {
      const result = await getNoteByPath(notePath);
      
      if (result.success && result.data) {
        setNote(result.data);
        toast.success('Note loaded successfully');
      } else {
        toast.error(result.error || 'Failed to load note');
      }
    } catch (error) {
      console.error('Error loading note:', error);
      toast.error('Failed to load note');
    }
    
    setLoading(false);
  };

  // 复制笔记内容到剪贴板
  const copyContent = async () => {
    if (!note) return;
    
    try {
      await navigator.clipboard.writeText(note.content);
      setCopied(true);
      toast.success('Content copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy content');
    }
  };

  // 在外部应用中打开笔记
  const openInExternalApp = () => {
    if (!note) return;
    
    // 尝试用默认程序打开文件
    const link = document.createElement('a');
    link.href = `file:///${note.filePath.replace(/\\/g, '/')}`;
    link.target = '_blank';
    link.click();
  };

  // 处理图片路径转换
  const processImageUrls = (content: string) => {
    if (!note) return content;
    
    // 获取笔记文件所在的目录
    const noteDir = note.relativePath.substring(0, note.relativePath.lastIndexOf('/'));
    
    // 处理 Obsidian 图片链接格式
    // 支持 ![[image.png]] 和 ![alt](path) 格式
    return content
      .replace(/!\[\[([^\]]+)\]\]/g, (match, imagePath) => {
        // 处理 ![[image.png]] 格式
        let finalPath = imagePath;
        
        if (!imagePath.includes('/') && !imagePath.includes('\\')) {
          // 如果图片路径不包含文件夹，尝试在笔记同级目录的assets文件夹中查找
          finalPath = `${noteDir}/assets/${imagePath}`;
        }
        
        const encodedPath = encodeURIComponent(finalPath);
        return `![${imagePath}](/api/obsidian-image?path=${encodedPath})`;
      })
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, imagePath) => {
        // 处理 ![alt](path) 格式，如果路径不是完整URL
        if (!imagePath.startsWith('http') && !imagePath.startsWith('/api/')) {
          const encodedPath = encodeURIComponent(imagePath);
          return `![${alt}](/api/obsidian-image?path=${encodedPath})`;
        }
        return match;
      });
  };

  // 构建返回链接，保持搜索状态
  const buildBackUrl = () => {
    const searchQuery = searchParams.get('q');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');
    
    let backUrl = '/obsidian-notes';
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('q', searchQuery);
    if (page) params.set('page', page);
    if (pageSize) params.set('pageSize', pageSize);
    
    if (params.toString()) {
      backUrl += '?' + params.toString();
    }
    
    return backUrl;
  };

  useEffect(() => {
    loadNote();
  }, [notePath]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p>Loading note...</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Note Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The requested note could not be found.
          </p>
          <Button asChild>
            <Link href={buildBackUrl()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Notes
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const processedContent = processImageUrls(note.content);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* 返回按钮 */}
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href={buildBackUrl()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Notes
          </Link>
        </Button>
      </div>

      {/* 笔记标题和元数据 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-2xl">{note.title}</CardTitle>
              <CardDescription>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {note.relativePath}
                </code>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyContent}>
                <Copy className="mr-2 h-4 w-4" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button variant="outline" size="sm" onClick={openInExternalApp}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 标签 */}
            {note.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* 元数据 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <div>
                  <div className="font-medium">Modified</div>
                  <div>{new Date(note.fileModified).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                <div>
                  <div className="font-medium">Size</div>
                  <div>{(note.size / 1024).toFixed(2)} KB</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                <div>
                  <div className="font-medium">Words</div>
                  <div>{note.wordCount.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Front Matter */}
            {Object.keys(note.frontMatter).length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">
                  Front Matter ({Object.keys(note.frontMatter).length} fields)
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded overflow-auto text-xs">
                  {JSON.stringify(note.frontMatter, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 笔记内容 */}
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeKatex]}
              components={{
                img: ({ src, alt, ...props }) => (
                  <img
                    src={src}
                    alt={alt}
                    className="max-w-full h-auto rounded-lg shadow-sm"
                    {...props}
                  />
                ),
                h1: ({ children, ...props }) => (
                  <h1 className="text-2xl font-bold mt-6 mb-4" {...props}>
                    {children}
                  </h1>
                ),
                h2: ({ children, ...props }) => (
                  <h2 className="text-xl font-semibold mt-5 mb-3" {...props}>
                    {children}
                  </h2>
                ),
                h3: ({ children, ...props }) => (
                  <h3 className="text-lg font-medium mt-4 mb-2" {...props}>
                    {children}
                  </h3>
                ),
                p: ({ children, ...props }) => (
                  <p className="mb-4 leading-relaxed" {...props}>
                    {children}
                  </p>
                ),
                code: ({ children, ...props }) => (
                  <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                    {children}
                  </code>
                ),
                pre: ({ children, ...props }) => (
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm" {...props}>
                    {children}
                  </pre>
                ),
                blockquote: ({ children, ...props }) => (
                  <blockquote className="border-l-4 border-muted pl-4 italic" {...props}>
                    {children}
                  </blockquote>
                ),
                ul: ({ children, ...props }) => (
                  <ul className="list-disc list-inside mb-4 space-y-1" {...props}>
                    {children}
                  </ul>
                ),
                ol: ({ children, ...props }) => (
                  <ol className="list-decimal list-inside mb-4 space-y-1" {...props}>
                    {children}
                  </ol>
                ),
                li: ({ children, ...props }) => (
                  <li className="ml-4" {...props}>
                    {children}
                  </li>
                ),
              }}
            >
              {processedContent}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
