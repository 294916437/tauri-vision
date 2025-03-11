import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useImageRecognition } from "@/hooks/useImageRecognition";
import { Loader2, Upload, AlertCircle, Image as ImageIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ImageRecognition() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { isProcessing, result, processImage, error } = useImageRecognition();

  // 处理图像文件选择
  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 创建预览URL
    const fileUrl = URL.createObjectURL(file);
    setImageFile(file);
    setPreviewUrl(fileUrl);
  }, []);

  // 处理图像识别提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;

    await processImage(imageFile);
  };

  // 处理拖放功能
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  }, []);

  // 释放预览URL资源
  const resetImage = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageFile(null);
    setPreviewUrl(null);
  }, [previewUrl]);

  return (
    <div className='mx-auto max-w-4xl px-4 py-8'>
      <h1 className='mb-6 text-2xl font-bold'>图像识别</h1>

      <div className='grid gap-8 md:grid-cols-2'>
        {/* 图像上传区域 */}
        <Card>
          <CardHeader>
            <CardTitle>上传图像</CardTitle>
            <CardDescription>选择或拖放一个图像文件进行识别</CardDescription>
          </CardHeader>

          <CardContent>
            <div
              className={`mb-4 flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed 
                ${previewUrl ? "border-primary/40 bg-primary/5" : "border-muted"} 
                transition-colors duration-200 hover:border-primary/70 hover:bg-primary/10`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}>
              {previewUrl ? (
                <div className='relative h-full w-full overflow-hidden rounded'>
                  <img src={previewUrl} alt='预览' className='h-full w-full object-contain' />
                </div>
              ) : (
                <>
                  <Upload className='mb-2 h-10 w-10 text-muted-foreground' />
                  <p className='text-sm text-muted-foreground'>拖放图像或点击下方按钮选择</p>
                </>
              )}
            </div>

            <div className='flex flex-col space-y-2'>
              <input
                id='imageInput'
                type='file'
                accept='image/*'
                onChange={handleImageChange}
                className='hidden'
              />
              <Button
                type='button'
                variant={previewUrl ? "outline" : "default"}
                onClick={() => document.getElementById("imageInput")?.click()}
                className='w-full'>
                <ImageIcon className='mr-2 h-4 w-4' />
                {previewUrl ? "更换图像" : "选择图像"}
              </Button>

              {previewUrl && (
                <Button
                  type='button'
                  variant='destructive'
                  onClick={resetImage}
                  className='w-full'>
                  移除图像
                </Button>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button
              variant='default'
              type='submit'
              disabled={!imageFile || isProcessing}
              onClick={handleSubmit}
              className='w-full'>
              {isProcessing ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  处理中...
                </>
              ) : (
                "开始识别"
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* 结果显示区域 */}
        <Card>
          <CardHeader>
            <CardTitle>识别结果</CardTitle>
            <CardDescription>
              {result ? "模型识别结果及置信度" : "上传并处理图像后显示结果"}
            </CardDescription>
          </CardHeader>

          <CardContent className='min-h-[280px]'>
            {isProcessing ? (
              <div className='flex flex-col items-center justify-center space-y-4'>
                <Loader2 className='h-8 w-8 animate-spin text-primary' />
                <div className='text-center'>
                  <p className='text-sm text-muted-foreground'>正在处理图像...</p>
                  <Progress className='mt-2 w-[200px]' value={undefined} />
                </div>
              </div>
            ) : error ? (
              <Alert variant='destructive' className='mb-4'>
                <AlertCircle className='h-4 w-4' />
                <AlertTitle>处理失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : result?.matches && result.matches.length > 0 ? (
              <div className='space-y-4'>
                {/* 添加顶部预测显示 */}
                {result.topPrediction && (
                  <div className='mb-2 rounded-md border border-primary/30 bg-primary/5 p-4'>
                    <h4 className='mb-2 text-sm font-medium text-muted-foreground'>最佳匹配</h4>
                    <div className='flex items-center justify-between'>
                      <span className='text-lg font-semibold text-primary'>
                        {result.topPrediction.label}
                      </span>
                      <span className='rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground'>
                        {(result.topPrediction.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                <h4 className='text-sm font-medium text-muted-foreground'>所有匹配项</h4>
                <div className='space-y-2'>
                  {result.matches.map((match, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between rounded-md p-3 transition-colors duration-200
                        ${
                          index === 0
                            ? "bg-primary/15 font-medium"
                            : "bg-muted/40 hover:bg-muted"
                        }`}>
                      <span>{match.label}</span>
                      <div className='flex flex-col items-end'>
                        <span className='rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                          {(match.confidence * 100).toFixed(1)}%
                        </span>
                        <Progress value={match.confidence * 100} className='mt-1 h-1.5 w-24' />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : result?.error ? (
              <Alert variant='destructive' className='mb-4'>
                <AlertCircle className='h-4 w-4' />
                <AlertTitle>处理错误</AlertTitle>
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            ) : (
              <div className='flex h-full mt-20 flex-col items-center justify-center text-center text-muted-foreground'>
                <ImageIcon className='mb-2 h-10 w-10' strokeOpacity={0.7} />
                <p>请上传一张图像并点击"开始识别"</p>
              </div>
            )}
          </CardContent>

          <CardFooter className='flex justify-between'>
            {result?.matches && result.matches.length > 0 && (
              <p className='text-sm text-muted-foreground'>
                识别完成，共 {result.matches.length} 个匹配项
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
