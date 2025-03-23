import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useImageRecognition } from "@/hooks/useImageRecognition";
import { Loader2, Upload, AlertCircle, Image as ImageIcon, CheckCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

export function ImageRecognition() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const {
    isUploading,
    isProcessing,
    uploadedImage,
    result,
    originalResult,
    error,
    uploadImage,
    processImage,
    saveHistory,
    historyStatus,
    resultSaved,
  } = useImageRecognition();

  // 处理图像文件选择
  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 创建预览URL
      const fileUrl = URL.createObjectURL(file);
      setPreviewUrl(fileUrl);

      // 立即上传图片
      await uploadImage(file);
    },
    [uploadImage]
  );

  // 处理图像识别提交 - 现在仅调用处理方法
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processImage();
  };

  // 处理拖放功能
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith("image/")) {
          setPreviewUrl(URL.createObjectURL(file));

          // 立即上传图片
          await uploadImage(file);
        }
      }
    },
    [uploadImage]
  );

  // 释放预览URL资源并重置状态
  const resetImage = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  }, [previewUrl]);

  // 当获得处理结果后，自动保存历史 - 只在条件满足且尚未保存时执行一次
  useEffect(() => {
    // 只有当有有效结果、没有错误、状态为pending且尚未保存时执行
    if (
      originalResult &&
      !originalResult.error &&
      !resultSaved &&
      historyStatus === "pending"
    ) {
      console.log("自动保存历史记录...");
      saveHistory();
    }
  }, [originalResult, saveHistory, resultSaved, historyStatus]);

  return (
    <div className='mx-auto max-w-4xl px-4 py-8'>
      <h1 className='mb-6 text-2xl font-bold'>图像识别</h1>

      <div className='grid gap-8 md:grid-cols-2'>
        {/* 图像上传区域 */}
        <Card>
          <CardHeader>
            <CardTitle>上传图像</CardTitle>
            <CardDescription>选择或拖放图像文件</CardDescription>
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

                  {/* 上传状态指示器 */}
                  {isUploading && (
                    <div className='absolute inset-0 flex items-center justify-center bg-black/40'>
                      <Loader2 className='h-10 w-10 text-white animate-spin' />
                    </div>
                  )}

                  {/* 上传成功指示器 */}
                  {uploadedImage && (
                    <Badge
                      variant='outline'
                      className='absolute top-2 right-2 bg-green-500/80 text-white'>
                      <CheckCircle className='mr-1 h-3 w-3' /> 已上传
                    </Badge>
                  )}
                </div>
              ) : (
                <>
                  <Upload className='mb-2 h-10 w-10 text-muted-foreground' />
                  <p className='text-sm text-muted-foreground'>拖放或点击下方按钮选择</p>
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
                disabled={isUploading}
              />
              <Button
                type='button'
                variant={previewUrl ? "outline" : "default"}
                onClick={() => document.getElementById("imageInput")?.click()}
                disabled={isUploading}
                className='w-full'>
                {isUploading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    上传中...
                  </>
                ) : (
                  <>
                    <ImageIcon className='mr-2 h-4 w-4' />
                    {previewUrl ? "更换图像" : "选择图像"}
                  </>
                )}
              </Button>

              {previewUrl && (
                <Button
                  type='button'
                  variant='destructive'
                  onClick={resetImage}
                  disabled={isUploading}
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
              disabled={!uploadedImage || isProcessing}
              onClick={handleSubmit}
              className='w-full'>
              {isProcessing ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  处理中...
                </>
              ) : (
                "识别图像"
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* 结果显示区域 */}
        <Card>
          <CardHeader>
            <CardTitle>识别结果</CardTitle>
            <CardDescription>
              {result ? "模型预测及置信度" : "上传并处理图像以查看结果"}
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

                <h4 className='text-sm font-medium text-muted-foreground'>所有匹配</h4>
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
                <p>上传图像并点击"识别图像"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
