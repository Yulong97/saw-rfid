'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { DXFViewer, type DXFViewerHandle } from 'dxf-react';
import 'dxf-react/style.css';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DxfPreviewProps {
  streamUrl: string;
  fileName: string;
}

async function waitForViewer(viewerRef: RefObject<DXFViewerHandle | null>) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (viewerRef.current) {
      return viewerRef.current;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('DXF viewer failed to initialize');
}

export default function DxfPreview({ streamUrl, fileName }: DxfPreviewProps) {
  const viewerRef = useRef<DXFViewerHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFile() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(streamUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        const viewer = await waitForViewer(viewerRef);
        await viewer.loadDXFFromBuffer(buffer);

        if (cancelled) return;

        requestAnimationFrame(() => {
          viewer.resize();
          window.setTimeout(() => viewer.resize(), 150);
          window.setTimeout(() => viewer.resize(), 400);
        });
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : 'Failed to load DXF file';
        if (!cancelled) {
          setError(message);
          toast.error('Failed to load DXF file');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadFile();

    return () => {
      cancelled = true;
    };
  }, [streamUrl]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      viewerRef.current?.resize();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-[70vh] min-h-[480px] w-full overflow-hidden rounded border bg-background"
    >
      <DXFViewer
        ref={viewerRef}
        fileName={fileName}
        autoFit
        showResetButton
        showExportButton
        showLayerPanel
        showRulers
        showFullscreenButton
        keyboardNavigation
        classes={{ root: '!absolute !inset-0 !h-full !w-full !flex-none' }}
        onError={(message) => {
          setError(message);
          setLoading(false);
          toast.error('Failed to render DXF file');
        }}
        onDxfLoaded={(success) => {
          if (success) {
            setError(null);
            viewerRef.current?.resize();
          }
        }}
      />

      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 px-6">
          <div className="flex max-w-md flex-col items-center gap-2 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
