import { Calendar, Home, Contact, Search, Settings, Database, ChevronRight, MapPin, Activity, BookOpen, Users, FlaskConical, Calculator } from "lucide-react"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuAction,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Menu items.
const items = [

  {
    title: "实验管理",
    url: "/experiments",
    icon: FlaskConical,
    subitems: [
      {
        title: "实验列表",
        url: "/experiments/list",
      },
      {
        title: "数据分析",
        url: "/experiments/analysis",
      },
      {
        title: "设备管理",
        url: "/experiments/equipment",
      },
    ],
  },
  {
    title: "文献管理",
    url: "/literature",
    icon: BookOpen,
    subitems: [
      {
        title: "论文库",
        url: "/literature/papers",
      },
      {
        title: "阅读笔记",
        url: "/literature/notes",
      },
      {
        title: "引用管理",
        url: "/literature/citations",
      },
    ],
  },
  {
    title: "数据管理",
    url: "/data",
    icon: Database,
    subitems: [
      {
        title: "数据集管理",
        url: "/data/datasets",
      },
      {
        title: "数据存储",
        url: "/data/storage",
      },
      {
        title: "备份恢复",
        url: "/data/backup",
      },
    ],
  },
]

export function AppSidebar() {
  return (
    
    <Sidebar collapsible="icon">

      {/* 这里是侧边栏的头部 */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <Home />
                <span>主页</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 这里是侧边栏的内容 */}
      <SidebarContent>
        {/* 分类一 */}
        <SidebarGroup>
          <SidebarGroupLabel>主菜单</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <Collapsible key={item.title} asChild defaultOpen={false}>
                  <SidebarMenuItem>
                    {item.subitems ? (
                      <>
                        <SidebarMenuButton asChild>
                          <Link href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuAction>
                            <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuAction>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subitems.map((subitem) => (
                              <SidebarMenuItem key={subitem.title}>
                                <SidebarMenuButton asChild>
                                  <Link href={subitem.url}>
                                    <span>{subitem.title}</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </>
                    ) : (
                      <SidebarMenuButton asChild>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 分类二 */}
        <SidebarGroup>
            <SidebarGroupLabel>工具</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <Link href="/search">
                                <Search />
                                <span>搜索</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <Link href="/RLC-calculator">
                                <Calculator />
                                <span>RLC谐振计算</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    
      {/* 这里是侧边栏的底部 */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/settings">
                <Settings />
                <span>设置</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

    </Sidebar>
  )
}

