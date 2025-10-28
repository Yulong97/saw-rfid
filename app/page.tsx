'use client';

import { useEffect, useState } from 'react';
import {
  getSAWTypes,
  createSAWType,
  getSAWItems,
  createSAWItem,
  deleteSAWItem,
} from '@/actions/main/saw-actions';
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
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import { BreadcrumbNav, breadcrumbConfigs } from '@/components/breadcrumb-nav';

interface SAWType {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

interface SAWItem {
  id: number;
  name: string | null;
  description: string | null;
  type_id: number | null;
  DesignParameter: any;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  type: SAWType | null;
}

export default function Home() {
  const [types, setTypes] = useState<SAWType[]>([]);
  const [items, setItems] = useState<SAWItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Type form state
  const [openTypeDialog, setOpenTypeDialog] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [typeDescription, setTypeDescription] = useState('');

  // Item form state
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemTypeId, setItemTypeId] = useState<string>('');
  const [itemDesignParam, setItemDesignParam] = useState('');

  // Load data
  const loadData = async () => {
    setLoading(true);
    const [typesResult, itemsResult] = await Promise.all([
      getSAWTypes(),
      getSAWItems(),
    ]);

    if (typesResult.success) {
      setTypes(typesResult.data || []);
    } else {
      toast.error(typesResult.error);
    }

    if (itemsResult.success) {
      setItems(itemsResult.data || []);
    } else {
      toast.error(itemsResult.error);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle create type
  const handleCreateType = async () => {
    if (!typeName.trim()) {
      toast.error('请输入类型名称');
      return;
    }

    const result = await createSAWType({
      name: typeName,
      description: typeDescription || undefined,
    });

    if (result.success) {
      toast.success('类型创建成功');
      setTypeName('');
      setTypeDescription('');
      setOpenTypeDialog(false);
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  // Handle create item
  const handleCreateItem = async () => {
    let designParam = null;
    if (itemDesignParam.trim()) {
      try {
        designParam = JSON.parse(itemDesignParam);
      } catch (e) {
        toast.error('设计参数 JSON 格式无效');
        return;
      }
    }

    const result = await createSAWItem({
      name: itemName || undefined,
      description: itemDescription || undefined,
      type_id: itemTypeId ? parseInt(itemTypeId) : undefined,
      DesignParameter: designParam,
    });

    if (result.success) {
      toast.success('项目创建成功');
      setItemName('');
      setItemDescription('');
      setItemTypeId('');
      setItemDesignParam('');
      setOpenItemDialog(false);
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  // Handle delete item
  const handleDeleteItem = async (id: number) => {
    if (!confirm('确定要删除此项目吗？')) {
      return;
    }

    const result = await deleteSAWItem(id);

    if (result.success) {
      toast.success('项目删除成功');
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* 面包屑导航 */}
      <BreadcrumbNav items={breadcrumbConfigs.home} />

      <div>
        <h1 className="text-3xl font-bold mb-2">SAW RFID 系统 - 测试页面</h1>
        <p className="text-muted-foreground">
          SAW 类型和项目的增删改查操作
        </p>
      </div>

      {/* SAW Types Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>SAW 类型</CardTitle>
              <CardDescription>管理 SAW 类型定义</CardDescription>
            </div>
            <Dialog open={openTypeDialog} onOpenChange={setOpenTypeDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  添加类型
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>创建新 SAW 类型</DialogTitle>
                  <DialogDescription>
                    为 SAW 项目添加新的类型定义
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type-name">名称 *</Label>
                    <Input
                      id="type-name"
                      value={typeName}
                      onChange={(e) => setTypeName(e.target.value)}
                      placeholder="输入类型名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type-description">描述</Label>
                    <Textarea
                      id="type-description"
                      value={typeDescription}
                      onChange={(e) => setTypeDescription(e.target.value)}
                      placeholder="输入类型描述"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenTypeDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateType}>创建</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {types.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              未找到类型。创建一个开始吧。
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {types.map((type) => (
                <Card key={type.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{type.name}</CardTitle>
                    <CardDescription>ID: {type.id}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {type.description || '无描述'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      创建时间: {new Date(type.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SAW Items Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>SAW 项目</CardTitle>
              <CardDescription>管理 SAW 项目实例</CardDescription>
            </div>
            <Dialog open={openItemDialog} onOpenChange={setOpenItemDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  添加项目
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>创建新 SAW 项目</DialogTitle>
                  <DialogDescription>
                    添加新的 SAW 项目实例
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="item-name">名称</Label>
                    <Input
                      id="item-name"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="输入项目名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-description">描述</Label>
                    <Textarea
                      id="item-description"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="输入项目描述"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-type">类型</Label>
                    <Select value={itemTypeId} onValueChange={setItemTypeId}>
                      <SelectTrigger id="item-type">
                        <SelectValue placeholder="选择类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-design-param">
                      设计参数 (JSON)
                    </Label>
                    <Textarea
                      id="item-design-param"
                      value={itemDesignParam}
                      onChange={(e) => setItemDesignParam(e.target.value)}
                      placeholder='{"key": "value"}'
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenItemDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateItem}>创建</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              未找到项目。创建一个开始吧。
            </p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {item.name || '未命名项目'}
                        </CardTitle>
                        <CardDescription>
                          ID: {item.id} | 类型: {item.type?.name || '无'}
                        </CardDescription>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">描述:</span>{' '}
                        {item.description || '无'}
                      </p>
                      {item.DesignParameter && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">设计参数:</p>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(item.DesignParameter, null, 2)}
                          </pre>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        创建时间: {new Date(item.createdAt).toLocaleString()} |
                        更新时间: {new Date(item.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
