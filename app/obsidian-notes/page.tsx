'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAllNotes, getNoteByPath, searchNotes, getAllFolders, getNotesByFolder, type ObsidianNote } from '@/actions/main/obsidian-actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, RefreshCw, Clock, Hash, HardDrive, Eye, ExternalLink, Search, X, ChevronLeft, ChevronRight, Folder } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { BreadcrumbNav, breadcrumbConfigs } from '@/components/breadcrumb-nav';

export default function ObsidianNotesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [notes, setNotes] = useState<ObsidianNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState<any>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const isInitialized = useRef(false);
  const lastUrlParams = useRef('');

  // Load folders
  const loadFolders = async () => {
    try {
      const result = await getAllFolders();
      if (result.success && result.data) {
        setFolders(result.data);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  // Load notes without URL update (for initial load from URL)
  const loadNotesWithoutUrlUpdate = async (page: number = currentPage, size: number = pageSize, folder: string = selectedFolder) => {
    setLoading(true);
    
    try {
      let result;
      if (folder === 'all') {
        result = await getAllNotes(page, size);
      } else {
        result = await getNotesByFolder(folder, page, size);
      }
      
      if (result.success) {
        setNotes(result.data || []);
        setSummary(result.summary);
        setPagination(result.pagination);
        setCurrentPage(page);
      } else {
        toast.error(result.error || 'Failed to load notes');
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  // Search notes without URL update (for initial load from URL)
  const handleSearchWithoutUrlUpdate = async (query: string, page: number = 1) => {
    if (!query.trim()) {
      loadNotesWithoutUrlUpdate(page);
      return;
    }

    setIsSearching(true);
    
    try {
      const result = await searchNotes(query, page, pageSize);
      
      if (result.success) {
        setNotes(result.data || []);
        setSummary(result.summary);
        setPagination(result.pagination);
        setCurrentPage(page);
      } else {
        toast.error(result.error || 'Failed to search notes');
      }
    } catch (error) {
      console.error('Error searching notes:', error);
      toast.error('Failed to search notes');
    } finally {
      setIsSearching(false);
    }
  };

  // Load notes
  const loadNotes = async (page: number = currentPage, size: number = pageSize, folder: string = selectedFolder) => {
    setLoading(true);
    
    try {
      let result;
      if (folder === 'all') {
        result = await getAllNotes(page, size);
      } else {
        result = await getNotesByFolder(folder, page, size);
      }
      
      if (result.success) {
        setNotes(result.data || []);
        setSummary(result.summary);
        setPagination(result.pagination);
        setCurrentPage(page);
      } else {
        toast.error(result.error || 'Failed to load notes');
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  // Search notes
  const handleSearch = async (query: string, page: number = 1) => {
    if (!query.trim()) {
      loadNotes(page);
      updateUrl('', page, pageSize);
      return;
    }

    setIsSearching(true);
    
    try {
      const result = await searchNotes(query, page, pageSize);
      
      if (result.success) {
        setNotes(result.data || []);
        setSummary(result.summary);
        setPagination(result.pagination);
        setCurrentPage(page);
        updateUrl(query, page, pageSize);
      } else {
        toast.error(result.error || 'Failed to search notes');
      }
    } catch (error) {
      console.error('Error searching notes:', error);
      toast.error('Failed to search notes');
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
    loadNotes(1);
    updateUrl('', 1, pageSize);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery, page);
    } else {
      loadNotes(page);
      updateUrl('', page, pageSize);
    }
  };

  // Handle page size change
  const handlePageSizeChange = (size: string) => {
    const newPageSize = parseInt(size);
    setPageSize(newPageSize);
    setCurrentPage(1);
    if (searchQuery.trim()) {
      handleSearch(searchQuery, 1);
    } else {
      loadNotes(1, newPageSize, selectedFolder);
      updateUrl('', 1, newPageSize, selectedFolder);
    }
  };

  // Handle folder change
  const handleFolderChange = (folder: string) => {
    setSelectedFolder(folder);
    setCurrentPage(1);
    if (searchQuery.trim()) {
      handleSearch(searchQuery, 1);
    } else {
      loadNotes(1, pageSize, folder);
      updateUrl('', 1, pageSize, folder);
    }
  };

  // 处理URL参数变化
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    const urlPage = parseInt(searchParams.get('page') || '1');
    const urlPageSize = parseInt(searchParams.get('pageSize') || '20');
    const urlFolder = searchParams.get('folder') || 'all';
    const currentUrlParams = `${urlQuery}-${urlPage}-${urlPageSize}-${urlFolder}`;
    
    // 初始化或URL参数改变时执行
    if (!isInitialized.current || lastUrlParams.current !== currentUrlParams) {
      isInitialized.current = true;
      lastUrlParams.current = currentUrlParams;
      
      setSearchQuery(urlQuery);
      setCurrentPage(urlPage);
      setPageSize(urlPageSize);
      setSelectedFolder(urlFolder);
      
      // 加载数据
      const loadData = async () => {
        setLoading(true);
        try {
          let result;
          if (urlQuery.trim()) {
            result = await searchNotes(urlQuery, urlPage, urlPageSize);
          } else if (urlFolder === 'all') {
            result = await getAllNotes(urlPage, urlPageSize);
          } else {
            result = await getNotesByFolder(urlFolder, urlPage, urlPageSize);
          }
          
          if (result.success) {
            setNotes(result.data || []);
            setSummary(result.summary);
            setPagination(result.pagination);
          } else {
            toast.error(result.error || 'Failed to load data');
          }
        } catch (error) {
          console.error('Error loading data:', error);
          toast.error('Failed to load data');
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }
  }, [searchParams]);

  // 初始化时加载文件夹列表
  useEffect(() => {
    loadFolders();
  }, []);

  // 更新URL参数
  const updateUrl = (query: string, page: number, size: number, folder: string = selectedFolder) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query);
    if (page > 1) params.set('page', page.toString());
    if (size !== 20) params.set('pageSize', size.toString());
    if (folder !== 'all') params.set('folder', folder);
    
    const newUrl = params.toString() ? `/obsidian-notes?${params.toString()}` : '/obsidian-notes';
    router.replace(newUrl, { scroll: false });
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p>Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* 面包屑导航 */}
      <BreadcrumbNav items={breadcrumbConfigs.obsidianNotes} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Obsidian Notes</h1>
        <p className="text-muted-foreground">
          Manage and browse your Obsidian notes
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="搜索笔记标题、内容、标签或文件名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery);
                  }
                }}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={() => handleSearch(searchQuery)}
              disabled={isSearching}
              variant="default"
            >
              {isSearching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
            {searchQuery && (
              <Button 
                onClick={clearSearch}
                variant="outline"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* 文件夹筛选 */}
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">筛选文件夹:</span>
            <Select value={selectedFolder} onValueChange={handleFolderChange}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="选择文件夹" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有文件夹</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder} value={folder}>
                    {folder || '根目录'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {summary?.searchQuery && (
            <div className="mt-2 text-sm text-muted-foreground">
              搜索结果: "{summary.searchQuery}" - 找到 {summary.total} 个笔记
            </div>
          )}
          {summary?.folderPath && summary.folderPath !== 'all' && !summary?.searchQuery && (
            <div className="mt-2 text-sm text-muted-foreground">
              文件夹筛选: "{summary.folderPath}" - 找到 {summary.total} 个笔记
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {pagination && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  显示第 {(pagination.currentPage - 1) * pagination.pageSize + 1} - {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} 条，共 {pagination.totalCount} 条
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">每页显示:</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        disabled={loading}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage || loading}
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
              <p className="text-xs text-muted-foreground">
                {summary.scannedFiles} files scanned
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(summary.totalSize / 1024 / 1024).toFixed(2)} MB
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(summary.totalSize / 1024)} KB total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Words</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalWords.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                ~{Math.round(summary.totalWords / summary.total)} words/note
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {notes[0] ? new Date(notes[0].fileModified).toLocaleDateString() : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Most recent note
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={() => loadNotes()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Notes
        </Button>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notes found</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <h2 className="text-xl font-semibold">Recent Notes (Top 20)</h2>
            {notes.map((note) => (
              <Card key={note.relativePath}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{note.title}</CardTitle>
                      <CardDescription>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {note.relativePath}
                        </code>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Tags */}
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {note.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Modified: {new Date(note.fileModified).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        <span>{(note.size / 1024).toFixed(2)} KB</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        <span>{note.wordCount} words</span>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div className="text-sm text-muted-foreground line-clamp-3 border-l-2 pl-3 border-muted">
                      {note.content.substring(0, 200)
                        .replace(/!\[\[([^\]]+)\]\]/g, '[Image: $1]')
                        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[Image: $1]')
                        .replace(/\$\$([^$]+)\$\$/g, '[Math Formula]')
                        .replace(/\$([^$]+)\$/g, '[Math]')}...
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button asChild size="sm" variant="default">
                        <Link href={`/obsidian-notes/${encodeURIComponent(note.relativePath)}?${searchParams.toString()}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Full Note
                        </Link>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = `file:///${note.filePath.replace(/\\/g, '/')}`;
                          link.target = '_blank';
                          link.click();
                        }}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open in App
                      </Button>
                    </div>

                    {/* Front Matter (if exists) */}
                    {Object.keys(note.frontMatter).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Front Matter ({Object.keys(note.frontMatter).length} fields)
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                          {JSON.stringify(note.frontMatter, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}