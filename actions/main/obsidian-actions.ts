'use server';

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Obsidian base path
const OBSIDIAN_BASE_PATH = process.env.OBSIDIAN_BASE_PATH || 
  'C:\\Users\\Yulong_Lab\\OneDrive\\obsidian\\Obsidian_Yulong';

// Note interface
export interface ObsidianNote {
  fileName: string;
  filePath: string;
  relativePath: string;
  title: string;
  content: string;
  frontMatter: Record<string, any>;
  tags: string[];
  created: Date | null;
  updated: Date | null;
  fileModified: Date;
  size: number;
  wordCount: number;
}

// Parse a single markdown file
function parseMarkdownFile(filePath: string): ObsidianNote | null {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);
    const { data: frontMatter, content } = matter(fileContent);
    
    // Extract tags from front matter
    const tagsFromFrontMatter = Array.isArray(frontMatter.tags) 
      ? frontMatter.tags 
      : typeof frontMatter.tags === 'string'
      ? frontMatter.tags.split(',').map((t: string) => t.trim())
      : [];
    
    // Extract inline tags (#tag)
    const inlineTagRegex = /#[\w\u4e00-\u9fa5-]+/g;
    const inlineTags = (content.match(inlineTagRegex) || [])
      .map(tag => tag.substring(1)); // Remove #
    
    // Combine and deduplicate tags
    const allTags = [...new Set([...tagsFromFrontMatter, ...inlineTags])];
    
    // Calculate word count (approximate)
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    // Get dates
    const created = frontMatter.created 
      ? new Date(frontMatter.created)
      : new Date(stats.birthtime);
    const updated = frontMatter.updated 
      ? new Date(frontMatter.updated)
      : new Date(stats.mtime);
    
    const relativePath = path.relative(OBSIDIAN_BASE_PATH, filePath);
    const fileName = path.basename(filePath);
    const title = frontMatter.title || fileName.replace('.md', '');
    
    return {
      fileName,
      filePath,
      relativePath: relativePath.replace(/\\/g, '/'),
      title,
      content,
      frontMatter,
      tags: allTags,
      created,
      updated,
      fileModified: new Date(stats.mtime),
      size: stats.size,
      wordCount,
    };
  } catch (error) {
    console.error(`Error parsing file ${filePath}:`, error);
    return null;
  }
}

// Recursively scan directory for markdown files
function scanMarkdownFiles(dir: string, baseDir: string = dir): string[] {
  let results: string[] = [];
  
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      // Skip hidden files and certain directories
      if (file.name.startsWith('.') || 
          file.name === 'node_modules' ||
          file.name === '.obsidian' ||
          file.name === '.trash') {
        continue;
      }
      
      if (file.isDirectory()) {
        results = results.concat(scanMarkdownFiles(fullPath, baseDir));
      } else if (file.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }
  
  return results;
}

// Get all notes (limited to prevent performance issues)
export async function getAllNotes(limit?: number) {
  try {
    const markdownFiles = scanMarkdownFiles(OBSIDIAN_BASE_PATH);
    let notes = markdownFiles
      .map(file => parseMarkdownFile(file))
      .filter((note): note is ObsidianNote => note !== null)
      .sort((a, b) => b.fileModified.getTime() - a.fileModified.getTime());
    
    // Apply limit if specified
    if (limit) {
      notes = notes.slice(0, limit);
    }
    
    return {
      success: true,
      data: notes,
      summary: {
        total: notes.length,
        scannedFiles: markdownFiles.length,
        totalSize: notes.reduce((sum, note) => sum + note.size, 0),
        totalWords: notes.reduce((sum, note) => sum + note.wordCount, 0),
      }
    };
  } catch (error) {
    console.error('Error getting all notes:', error);
    return { success: false, error: 'Failed to get notes' };
  }
}

// Get note by relative path
export async function getNoteByPath(relativePath: string) {
  try {
    const fullPath = path.join(OBSIDIAN_BASE_PATH, relativePath);
    
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'Note not found' };
    }
    
    const note = parseMarkdownFile(fullPath);
    
    if (!note) {
      return { success: false, error: 'Failed to parse note' };
    }
    
    return {
      success: true,
      data: note,
    };
  } catch (error) {
    console.error('Error getting note by path:', error);
    return { success: false, error: 'Failed to get note' };
  }
}