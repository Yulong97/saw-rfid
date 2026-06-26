'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BreadcrumbNav, breadcrumbConfigs } from '@/components/breadcrumb-nav';
import { ArrowLeft, Download, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FileInfo {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  extension: string;
  isPreviewable: boolean;
  mimeType: string;
}

function PdfViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const recordId = searchParams.get('id');

  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recordId) {
      setError('Missing file ID');
      setLoading(false);
      return;
    }

    const fetchFileInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/preview?id=${recordId}&type=info`);
        const result = await response.json();

        if (!result.success) {
          setError(result.error || 'Failed to load file');
          return;
        }

        if (result.data.fileType !== 'pdf') {
          setError('This file is not a PDF');
          return;
        }

        if (!result.data.isPreviewable) {
          setError('PDF preview is not supported for this file');
          return;
        }

        setFileInfo(result.data);
      } catch {
        setError('Failed to load file information');
      } finally {
        setLoading(false);
      }
    };

    fetchFileInfo();
  }, [recordId]);

  const handleDownload = async () => {
    if (!recordId || !fileInfo) return;

    try {
      const response = await fetch(`/api/download?id=${recordId}`);

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Download failed');
        return;
      }

      const contentDisposition = response.headers.get('content-disposition');
      const downloadFileName = contentDisposition
        ? decodeURIComponent(contentDisposition.split('filename=')[1]?.replace(/"/g, '') || fileInfo.fileName)
        : fileInfo.fileName;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`File "${downloadFileName}" downloaded`);
    } catch {
      toast.error('Download failed');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const breadcrumbItems = fileInfo
    ? breadcrumbConfigs.pdfViewer(fileInfo.fileName)
    : breadcrumbConfigs.dataManagement;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6 gap-4">
      <BreadcrumbNav items={breadcrumbItems} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/data-management')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {fileInfo && (
            <div>
              <h1 className="text-xl font-semibold">{fileInfo.fileName}</h1>
              <p className="text-sm text-muted-foreground">{formatFileSize(fileInfo.fileSize)}</p>
            </div>
          )}
        </div>

        {fileInfo && (
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 rounded-lg border bg-muted overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading PDF...</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <AlertCircle className="h-10 w-10" />
            <p>{error}</p>
            <Button variant="outline" onClick={() => router.push('/data-management')}>
              Back to Data Management
            </Button>
          </div>
        )}

        {!loading && !error && fileInfo && recordId && (
          <iframe
            src={`/api/stream?id=${recordId}`}
            className="w-full h-full border-0"
            title={fileInfo.fileName}
          />
        )}
      </div>
    </div>
  );
}

export default function PdfViewerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <PdfViewerContent />
    </Suspense>
  );
}
