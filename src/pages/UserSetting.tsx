import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function UserSetting() {
  const [activeTab, setActiveTab] = useState("account");

  return (
    <div className='container mx-auto py-6 space-y-6'>
      <div>
        <h2 className='text-3xl font-bold tracking-tight mb-2'>用户设置</h2>
        <Separator className='my-4' />
      </div>

      <Card>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='grid grid-cols-5 w-full'>
            <TabsTrigger value='account'>账户信息</TabsTrigger>
            <TabsTrigger value='application'>应用配置</TabsTrigger>
            <TabsTrigger value='models'>视觉模型</TabsTrigger>
            <TabsTrigger value='storage'>数据存储</TabsTrigger>
            <TabsTrigger value='interface'>界面设置</TabsTrigger>
          </TabsList>

          {/* 账户信息 */}
          <TabsContent value='account' className='p-4 space-y-6'>
            <h3 className='text-xl font-semibold mb-4'>个人账户设置</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-2'>
                <Label htmlFor='username'>用户名</Label>
                <Input id='username' value='当前用户' disabled />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='email'>电子邮箱</Label>
                <Input id='email' defaultValue='user@example.com' />
              </div>
            </div>
            <div className='flex gap-2 mt-6'>
              <Button>更新个人信息</Button>
              <Button variant='outline'>修改密码</Button>
            </div>
          </TabsContent>

          {/* 应用配置 */}
          <TabsContent value='application' className='p-4 space-y-6'>
            <h3 className='text-xl font-semibold mb-4'>应用程序配置</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-2'>
                <Label htmlFor='python-path'>Python 解释器路径</Label>
                <Input id='python-path' defaultValue='C:\Python310\python.exe' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='temp-dir'>临时文件目录</Label>
                <Input id='temp-dir' defaultValue='uploads' />
              </div>
            </div>
            <div className='space-y-4 mt-4'>
              <div className='flex items-center gap-2'>
                <Switch id='auto-update' defaultChecked />
                <Label htmlFor='auto-update'>启动时自动检查更新</Label>
              </div>
              <div className='flex items-center gap-2'>
                <Switch id='collect-data' defaultChecked />
                <Label htmlFor='collect-data'>允许收集匿名使用数据</Label>
              </div>
            </div>
            <Button className='mt-4'>保存配置</Button>
          </TabsContent>

          {/* 视觉模型 */}
          <TabsContent value='models' className='p-4 space-y-6'>
            <h3 className='text-xl font-semibold mb-4'>模型配置</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-2'>
                <Label htmlFor='default-model'>默认视觉模型</Label>
                <Select defaultValue='yolov8'>
                  <SelectTrigger>
                    <SelectValue placeholder='选择默认模型' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='yolov8'>YOLOv8</SelectItem>
                    <SelectItem value='ssd'>SSD MobileNet</SelectItem>
                    <SelectItem value='faster_rcnn'>Faster R-CNN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='model-path'>模型权重路径</Label>
                <Input id='model-path' defaultValue='models/yolov8n.pt' />
              </div>
            </div>
            <div className='flex items-center gap-2 mt-4'>
              <Switch id='gpu-accel' defaultChecked />
              <Label htmlFor='gpu-accel'>使用GPU加速（如果可用）</Label>
            </div>
            <div className='flex gap-2 mt-6'>
              <Button>保存模型设置</Button>
              <Button variant='outline'>下载更多模型</Button>
            </div>
          </TabsContent>

          {/* 数据存储 */}
          <TabsContent value='storage' className='p-4 space-y-6'>
            <h3 className='text-xl font-semibold mb-4'>数据存储设置</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-2'>
                <Label htmlFor='mongodb-uri'>MongoDB URI</Label>
                <Input
                  id='mongodb-uri'
                  defaultValue='mongodb+srv://user:****@cluster.mongodb.net/vision_db'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='db-name'>数据库名称</Label>
                <Input id='db-name' defaultValue='vision_db' />
              </div>
            </div>
            <div className='flex items-center gap-4 mt-4'>
              <span>自动清理历史记录:</span>
              <Select defaultValue='30'>
                <SelectTrigger className='w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='7'>7天后</SelectItem>
                  <SelectItem value='30'>30天后</SelectItem>
                  <SelectItem value='90'>90天后</SelectItem>
                  <SelectItem value='0'>永不</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='flex gap-2 mt-6'>
              <Button>保存存储设置</Button>
              <Button variant='destructive'>清除所有数据</Button>
            </div>
          </TabsContent>

          {/* 界面设置 */}
          <TabsContent value='interface' className='p-4 space-y-6'>
            <h3 className='text-xl font-semibold mb-4'>界面偏好设置</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-2'>
                <Label htmlFor='theme'>主题</Label>
                <Select defaultValue='system'>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='light'>浅色</SelectItem>
                    <SelectItem value='dark'>深色</SelectItem>
                    <SelectItem value='system'>跟随系统</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='language'>语言</Label>
                <Select defaultValue='zh_CN'>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='zh_CN'>简体中文</SelectItem>
                    <SelectItem value='en_US'>English (US)</SelectItem>
                    <SelectItem value='ja_JP'>日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='space-y-4 mt-4'>
              <div className='flex items-center gap-2'>
                <Switch id='advanced-features' defaultChecked />
                <Label htmlFor='advanced-features'>显示高级功能</Label>
              </div>
              <div className='flex items-center gap-2'>
                <Switch id='auto-save' defaultChecked />
                <Label htmlFor='auto-save'>自动保存识别历史</Label>
              </div>
            </div>
            <Button className='mt-4'>应用界面设置</Button>
          </TabsContent>
        </Tabs>
      </Card>

      <div className='flex justify-end mt-8'>
        <p className='text-sm text-muted-foreground'>
          Whale Vision v1.1.0 - 设置页面（开发中）
        </p>
      </div>
    </div>
  );
}
