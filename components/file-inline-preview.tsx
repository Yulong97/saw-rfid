'use client';

import { isImageFile, isVideoFile } from '@/lib/file-types';

interface FileInlinePreviewProps {
  recordId: number;
  filePath?: string | null;
  title: string;
}

export default function FileInlinePreview({
  recordId,
  filePath,
  title,
}: FileInlinePreviewProps) {
  const src = `/api/stream?id=${recordId}`;

  if (isImageFile(filePath, title)) {
    return (
      <div className="rounded-lg border bg-muted overflow-hidden">
        <img
          src={src}
          alt={title}
          className="w-full max-h-80 object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  if (isVideoFile(filePath, title)) {
    return (
      <div className="rounded-lg border bg-muted overflow-hidden">
        <video
          src={src}
          controls
          preload="metadata"
          className="w-full max-h-80"
        />
      </div>
    );
  }

  return null;
}
