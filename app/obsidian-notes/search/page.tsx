'use client';

import { useEffect, useState } from 'react';
import { getAllNotes, type ObsidianNote } from '@/actions/main/obsidian-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function NoteSearchPage() {
  const [notes, setNotes] = useState<ObsidianNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<ObsidianNote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // 加载所有笔记
  const loadNotes = async () => {
    setLoading(true);
    try {
      const result = await getAllNotes(); // 不限制数量用于搜索
      if (result.success && result.data) {
        setNotes(result.data);
        setFilteredNotes(result.data);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
    setLoading(false);
  };

  // 搜索功能
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredNotes(notes);
      return;
    }

    const filtered = notes.filter(note => 
      note.title.toLowerCase().includes(term.toLowerCase()) ||
      note.content.toLowerCase().includes(term.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(term.toLowerCase())) ||
      note.relativePath.toLowerCase().includes(term.toLowerCase())
    );
    
    setFilteredNotes(filtered);
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
    <div className="container mx-auto p-6">
      {/* 返回按钮 */}
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/obsidian-notes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Notes
          </Link>
        </Button>
      </div>

      {/* 搜索框 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Search Notes</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, content, tags, or path..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Found {filteredNotes.length} notes
        </p>
      </div>

      {/* 搜索结果 */}
      <div className="space-y-4">
        {filteredNotes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No notes found matching your search' : 'No notes available'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotes.map((note) => (
            <Card key={note.relativePath}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{note.title}</CardTitle>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {note.relativePath}
                    </code>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/obsidian-notes/${encodeURIComponent(note.relativePath)}`}>
                      View Note
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
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

                  {/* 内容预览 */}
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {note.content.substring(0, 150)}...
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
