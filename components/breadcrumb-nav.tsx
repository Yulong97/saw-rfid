'use client';

import Link from 'next/link';
import { Home, Database, StickyNote, FileText } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function BreadcrumbNav({ items, className }: BreadcrumbNavProps) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, index) => (
          <div key={index} className="flex items-center">
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink href={item.href} className="flex items-center gap-1">
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="flex items-center gap-1">
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < items.length - 1 && <BreadcrumbSeparator />}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// 预定义的面包屑配置
export const breadcrumbConfigs = {
  home: [
    { label: '主页', href: '/', icon: Home },
    { label: 'SAW RFID 系统' }
  ],
  dataManagement: [
    { label: '主页', href: '/', icon: Home },
    { label: '数据管理', href: '/data-management', icon: Database },
    { label: '文件管理' }
  ],
  obsidianNotes: [
    { label: '主页', href: '/', icon: Home },
    { label: '笔记管理', href: '/obsidian-notes', icon: StickyNote },
    { label: '笔记浏览' }
  ],
  noteDetail: (noteTitle: string, backUrl: string) => [
    { label: '主页', href: '/', icon: Home },
    { label: '笔记管理', href: '/obsidian-notes', icon: StickyNote },
    { label: '笔记浏览', href: backUrl, icon: FileText },
    { label: noteTitle }
  ]
};
