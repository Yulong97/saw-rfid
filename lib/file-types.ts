export type FileCategory =
  | 'all'
  | 'image'
  | 'video'
  | 'pdf'
  | 'audio'
  | 'text'
  | 'code'
  | 'dxf'
  | 'other';

export type SortOption =
  | 'updatedDesc'
  | 'updatedAsc'
  | 'createdDesc'
  | 'createdAsc'
  | 'titleAsc'
  | 'titleDesc';

export const FILE_CATEGORY_LABELS: Record<FileCategory, string> = {
  all: 'All',
  image: 'Image',
  video: 'Video',
  pdf: 'PDF',
  audio: 'Audio',
  text: 'Text',
  code: 'Code',
  dxf: 'DXF',
  other: 'Other',
};

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'];
const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.webm'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a'];
const PDF_EXTENSIONS = ['.pdf'];
const TEXT_EXTENSIONS = ['.txt', '.csv', '.json', '.xml', '.log', '.md'];
const CODE_EXTENSIONS = [
  '.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.html',
  '.py', '.java', '.cpp', '.c', '.php', '.rb', '.go', '.rs',
];
const DXF_EXTENSIONS = ['.dxf'];

function getFileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

export function getFileCategory(
  filePath?: string | null,
  title?: string
): Exclude<FileCategory, 'all'> {
  const ext = getFileExtension(filePath || title || '');

  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (TEXT_EXTENSIONS.includes(ext)) return 'text';
  if (CODE_EXTENSIONS.includes(ext)) return 'code';
  if (DXF_EXTENSIONS.includes(ext)) return 'dxf';
  return 'other';
}

export function matchesCategory(
  category: FileCategory,
  filePath?: string | null,
  title?: string
): boolean {
  if (category === 'all') return true;
  return getFileCategory(filePath, title) === category;
}

export function sortRecords<T extends {
  title: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}>(records: T[], sortBy: SortOption): T[] {
  const sorted = [...records];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'titleAsc':
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      case 'titleDesc':
        return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
      case 'createdAsc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'createdDesc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'updatedAsc':
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case 'updatedDesc':
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  return sorted;
}

export function countByCategory<T extends { file_path_relative?: string | null; title: string }>(
  records: T[]
): Record<FileCategory, number> {
  const counts: Record<FileCategory, number> = {
    all: records.length,
    image: 0,
    video: 0,
    pdf: 0,
    audio: 0,
    text: 0,
    code: 0,
    dxf: 0,
    other: 0,
  };

  for (const record of records) {
    counts[getFileCategory(record.file_path_relative, record.title)] += 1;
  }

  return counts;
}

// 供内联预览使用的扩展名判断
export function isImageFile(filePath?: string | null, title?: string): boolean {
  return getFileCategory(filePath, title) === 'image';
}

export function isVideoFile(filePath?: string | null, title?: string): boolean {
  return getFileCategory(filePath, title) === 'video';
}
