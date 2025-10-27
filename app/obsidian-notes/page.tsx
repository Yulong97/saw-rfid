'use client';

import { useEffect, useState } from 'react';
import { getAllNotes, getNoteByPath, type ObsidianNote } from '@/actions/main/obsidian-actions';
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
import { FileText, RefreshCw, Clock, Hash, HardDrive, Eye, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export default function ObsidianNotesPage() {
  const [notes, setNotes] = useState<ObsidianNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  // Load notes
  const loadNotes = async () => {
    setLoading(true);
    
    try {
      const result = await getAllNotes(20); // Load only 20 most recent notes for testing
      
      if (result.success) {
        setNotes(result.data || []);
        setSummary(result.summary);
        toast.success(`Successfully loaded ${result.data?.length || 0} notes`);
      } else {
        toast.error(result.error || 'Failed to load notes');
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadNotes();
  }, []);

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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Obsidian Notes</h1>
        <p className="text-muted-foreground">
          Manage and browse your Obsidian notes
        </p>
      </div>

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
                {(summary.totalSize / 1024).toFixed(0)} KB total
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
        <Button onClick={loadNotes} disabled={loading}>
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
                        <Link href={`/obsidian-notes/${encodeURIComponent(note.relativePath)}`}>
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