// src/pages/ModelSettings.tsx
import { useModels } from "@/hooks/useModels";
import { ModelSelector } from "@/components/custom/model-selector";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function ModelSettings() {
  const { models, activeModelId, activeModel, loading, error, switchModel } = useModels();

  return (
    <div className='container py-6 space-y-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>模型管理</h1>
        <p className='mt-2 text-muted-foreground'>配置和切换模型以适应不同的图像识别需求</p>
      </div>

      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className='flex items-center gap-4'>
        <span className='text-sm font-medium'>当前模型:</span>
        <ModelSelector
          models={models}
          activeModelId={activeModelId}
          onSelectModel={switchModel}
          loading={loading}
        />
      </div>

      {activeModel && (
        <Tabs defaultValue='details' className='mt-6'>
          <TabsList>
            <TabsTrigger value='details'>模型详情</TabsTrigger>
            <TabsTrigger value='performance'>性能指标</TabsTrigger>
            <TabsTrigger value='settings'>高级设置</TabsTrigger>
          </TabsList>
          <TabsContent value='details' className='space-y-4 mt-4'>
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle>{activeModel.name}</CardTitle>
                    <CardDescription>{activeModel.description}</CardDescription>
                  </div>
                  <Badge variant={activeModel.is_active ? "default" : "outline"}>
                    {activeModel.is_active ? "活跃" : "非活跃"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className='grid gap-2'>
                  <div className='grid grid-cols-3 gap-4'>
                    <div>
                      <h4 className='text-sm font-medium'>模型类型</h4>
                      <p className='text-sm text-muted-foreground'>{activeModel.model_type}</p>
                    </div>
                    <div>
                      <h4 className='text-sm font-medium'>支持类别数</h4>
                      <p className='text-sm text-muted-foreground'>
                        {activeModel.num_classes} 类
                      </p>
                    </div>
                    <div>
                      <h4 className='text-sm font-medium'>脚本路径</h4>
                      <p className='text-sm text-muted-foreground truncate'>
                        {activeModel.script_path}
                      </p>
                    </div>
                  </div>

                  <Separator className='my-4' />

                  <div>
                    <h4 className='text-sm font-medium mb-2'>模型位置</h4>
                    <p className='text-sm text-muted-foreground break-all'>
                      {activeModel.path}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='performance'>
            <Card>
              <CardHeader>
                <CardTitle>性能指标</CardTitle>
                <CardDescription>模型的精度、速度和资源占用等性能指标</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='text-center text-muted-foreground py-8'>
                  此功能正在开发中，敬请期待...
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='settings'>
            <Card>
              <CardHeader>
                <CardTitle>高级设置</CardTitle>
                <CardDescription>配置模型的执行参数和行为</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='text-center text-muted-foreground py-8'>
                  此功能正在开发中，敬请期待...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
