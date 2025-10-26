'use client';

import { useEffect, useState } from 'react';
import {
  getDataManagementRecords,
  scanAndSyncDataFiles,
  incrementalSyncDataFiles,
  createDataManagementRecord,
  updateDataManagementRecord,
  deleteDataManagementRecord,
  getFileInfo,
  uploadFile,
  uploadMultipleFiles,
  downloadFile,
  downloadMultipleFiles,
  getFileDownloadUrl,
} from '@/actions/main/data-management-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Trash2, 
  Plus, 
  RefreshCw, 
  FileText, 
  Download,
  Eye,
  Edit,
  Upload,
  X,
  CheckSquare,
  Square
} from 'lucide-react';

interface DataManagementRecord {
  id: number;
  title: string;
  description: string | null;
  file_path_relative: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export default function DataManagementPage() {
  const [records, setRecords] = useState<DataManagementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 表单状态
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DataManagementRecord | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [filePath, setFilePath] = useState('');
  const [status, setStatus] = useState('active');

  // 上传状态
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');

  // 下载状态
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);
  const [downloading, setDownloading] = useState(false);

  // 同步状态
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncMode, setSyncMode] = useState<'full' | 'incremental'>('incremental');

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    const result = await getDataManagementRecords();
    
    if (result.success) {
      setRecords(result.data || []);
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  // 扫描并同步文件
  const handleScanAndSync = async () => {
    setSyncing(true);
    
    try {
      let result;
      if (syncMode === 'incremental' && lastSyncTime) {
        result = await incrementalSyncDataFiles(lastSyncTime);
      } else {
        result = await scanAndSyncDataFiles();
      }
      
      if (result.success && result.data) {
        if ('summary' in result.data) {
          const summary = result.data.summary as { created: number; updated: number; deleted: number; unchanged?: number };
          const message = `同步完成！新增: ${summary.created}，更新: ${summary.updated}，删除: ${summary.deleted}${summary.unchanged ? `，未变化: ${summary.unchanged}` : ''}`;
          toast.success(message);
        } else {
          toast.success('同步完成');
        }
        
        // 更新最后同步时间
        setLastSyncTime(new Date());
        loadData();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('同步失败');
    }
    
    setSyncing(false);
  };

  // 创建/更新记录
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('请输入标题');
      return;
    }

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      file_path_relative: filePath.trim() || undefined,
      status,
    };

    let result;
    if (editingRecord) {
      result = await updateDataManagementRecord(editingRecord.id, data);
    } else {
      result = await createDataManagementRecord(data);
    }

    if (result.success) {
      toast.success(editingRecord ? '记录更新成功' : '记录创建成功');
      resetForm();
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  // 删除记录
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此记录吗？')) {
      return;
    }

    const result = await deleteDataManagementRecord(id);
    
    if (result.success) {
      toast.success('记录删除成功');
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  // 重置表单
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFilePath('');
    setStatus('active');
    setEditingRecord(null);
    setOpenDialog(false);
  };

  // 编辑记录
  const handleEdit = (record: DataManagementRecord) => {
    setEditingRecord(record);
    setTitle(record.title);
    setDescription(record.description || '');
    setFilePath(record.file_path_relative || '');
    setStatus(record.status);
    setOpenDialog(true);
  };

  // 查看文件信息
  const handleViewFile = async (relativePath: string) => {
    const result = await getFileInfo(relativePath);
    
    if (result.success && result.data) {
      const info = result.data;
      toast.success(`文件大小: ${(info.size / 1024).toFixed(2)} KB\n修改时间: ${new Date(info.modified).toLocaleString()}`);
    } else {
      toast.error(result.error);
    }
  };

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  // 移除选中的文件
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 上传单个文件
  const handleSingleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('请选择要上传的文件');
      return;
    }

    setUploading(true);
    const file = selectedFiles[0];
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', uploadTitle || file.name);
    formData.append('description', uploadDescription);

    const result = await uploadFile(formData);
    
    if (result.success) {
      toast.success(`文件 "${file.name}" 上传成功`);
      resetUploadForm();
      loadData();
    } else {
      toast.error(result.error);
    }
    
    setUploading(false);
  };

  // 批量上传文件
  const handleMultipleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('请选择要上传的文件');
      return;
    }

    setUploading(true);
    
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    const result = await uploadMultipleFiles(formData);
    
    if (result.success && result.data) {
      if ('summary' in result.data) {
        const summary = result.data.summary as { successful: number; failed: number };
        toast.success(`批量上传完成！成功: ${summary.successful}，失败: ${summary.failed}`);
      } else {
        toast.success(`批量上传完成！处理了 ${result.data.length} 个文件`);
      }
      resetUploadForm();
      loadData();
    } else {
      toast.error(result.error);
    }
    
    setUploading(false);
  };

  // 重置上传表单
  const resetUploadForm = () => {
    setSelectedFiles([]);
    setUploadTitle('');
    setUploadDescription('');
    setOpenUploadDialog(false);
  };

  // 选择/取消选择记录
  const toggleRecordSelection = (recordId: number) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedRecords.length === records.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.map(record => record.id));
    }
  };

  // 下载单个文件
  const handleDownloadSingle = async (recordId: number) => {
    setDownloading(true);
    
    try {
      // 使用 API 路由下载文件
      const response = await fetch(`/api/download?id=${recordId}`);
      
      if (response.ok) {
        // 获取文件名
        const contentDisposition = response.headers.get('content-disposition');
        const fileName = contentDisposition 
          ? decodeURIComponent(contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'download')
          : 'download';
        
        // 创建 Blob 并下载
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success(`文件 "${fileName}" 下载成功`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || '下载失败');
      }
    } catch (error) {
      toast.error('下载失败');
    }
    
    setDownloading(false);
  };

  // 批量下载文件
  const handleDownloadMultiple = async () => {
    if (selectedRecords.length === 0) {
      toast.error('请选择要下载的文件');
      return;
    }

    setDownloading(true);
    
    try {
      // 逐个下载选中的文件
      let successCount = 0;
      const failedFiles = [];

      for (const recordId of selectedRecords) {
        try {
          const response = await fetch(`/api/download?id=${recordId}`);
          
          if (response.ok) {
            // 获取文件名
            const contentDisposition = response.headers.get('content-disposition');
            const fileName = contentDisposition 
              ? decodeURIComponent(contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'download')
              : 'download';
            
            // 创建 Blob 并下载
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            successCount++;
            
            // 添加小延迟避免浏览器阻止多个下载
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            const errorData = await response.json();
            failedFiles.push(errorData.error || '下载失败');
          }
        } catch (error) {
          failedFiles.push(`文件 ${recordId} 下载失败`);
        }
      }
      
      if (failedFiles.length > 0) {
        toast.warning(`部分文件下载失败: ${failedFiles.join(', ')}`);
      }
      
      if (successCount > 0) {
        toast.success(`成功下载 ${successCount} 个文件`);
      }
      
      setSelectedRecords([]);
    } catch (error) {
      toast.error('批量下载失败');
    }
    
    setDownloading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">数据管理</h1>
        <p className="text-muted-foreground">
          管理网盘中的原始数据文件
        </p>
        {lastSyncTime && (
          <p className="text-sm text-muted-foreground mt-1">
            上次同步: {lastSyncTime.toLocaleString()} | 同步模式: {syncMode === 'incremental' ? '增量' : '全量'}
          </p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-4">
        <Dialog open={openUploadDialog} onOpenChange={setOpenUploadDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetUploadForm}>
              <Upload className="mr-2 h-4 w-4" />
              上传文件
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>上传文件</DialogTitle>
              <DialogDescription>
                选择文件上传到网盘目录，系统会自动创建数据管理记录
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">选择文件</Label>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">已选择的文件:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(index)}
                            className="h-6 w-6"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedFiles.length === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="upload-title">文件标题</Label>
                    <Input
                      id="upload-title"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="输入文件标题（可选）"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upload-description">文件描述</Label>
                    <Textarea
                      id="upload-description"
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder="输入文件描述（可选）"
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={resetUploadForm}>
                取消
              </Button>
              {selectedFiles.length === 1 ? (
                <Button onClick={handleSingleUpload} disabled={uploading}>
                  {uploading ? '上传中...' : '上传文件'}
                </Button>
              ) : (
                <Button onClick={handleMultipleUpload} disabled={uploading}>
                  {uploading ? '上传中...' : `批量上传 (${selectedFiles.length})`}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              添加记录
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRecord ? '编辑记录' : '创建新记录'}
              </DialogTitle>
              <DialogDescription>
                {editingRecord ? '修改数据管理记录' : '添加新的数据管理记录'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">标题 *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入文件标题"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="输入文件描述"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file-path">文件路径</Label>
                <Input
                  id="file-path"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="例如: test/data.csv"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">状态</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">活跃</SelectItem>
                    <SelectItem value="inactive">非活跃</SelectItem>
                    <SelectItem value="archived">已归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingRecord ? '更新' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex items-center gap-2">
          <Select value={syncMode} onValueChange={(value: 'full' | 'incremental') => setSyncMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="incremental">增量同步</SelectItem>
              <SelectItem value="full">全量同步</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleScanAndSync} 
            disabled={syncing}
            variant="outline"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同步中...' : '扫描并同步文件'}
          </Button>
        </div>

        {selectedRecords.length > 0 && (
          <Button 
            onClick={handleDownloadMultiple} 
            disabled={downloading}
            variant="default"
          >
            <Download className={`mr-2 h-4 w-4 ${downloading ? 'animate-pulse' : ''}`} />
            {downloading ? '下载中...' : `下载选中文件 (${selectedRecords.length})`}
          </Button>
        )}
      </div>

      {/* 记录列表 */}
      <div className="space-y-4">
        {records.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">未找到数据记录</p>
              <p className="text-sm text-muted-foreground mt-2">
                点击"扫描并同步文件"来同步网盘中的文件
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 全选按钮 */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="flex items-center gap-2"
              >
                {selectedRecords.length === records.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {selectedRecords.length === records.length ? '取消全选' : '全选'}
              </Button>
              <span className="text-sm text-muted-foreground">
                已选择 {selectedRecords.length} / {records.length} 个文件
              </span>
            </div>

            {records.map((record) => (
              <Card key={record.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleRecordSelection(record.id)}
                        className="h-6 w-6 p-0"
                      >
                        {selectedRecords.includes(record.id) ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{record.title}</CardTitle>
                        <CardDescription>
                          ID: {record.id} | 状态: {record.status}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {record.file_path_relative && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDownloadSingle(record.id)}
                          disabled={downloading}
                          title="下载文件"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(record)}
                        title="编辑记录"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {record.file_path_relative && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleViewFile(record.file_path_relative!)}
                          title="查看文件信息"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(record.id)}
                        title="删除记录"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">描述:</span>{' '}
                    {record.description || '无'}
                  </p>
                  {record.file_path_relative && (
                    <p className="text-sm">
                      <span className="font-medium">文件路径:</span>{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">
                        {record.file_path_relative}
                      </code>
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant={record.status === 'active' ? 'default' : 'secondary'}>
                      {record.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      创建: {new Date(record.createdAt).toLocaleDateString()} | 
                      更新: {new Date(record.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
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
