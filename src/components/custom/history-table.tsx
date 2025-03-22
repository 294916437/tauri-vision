"use client";
import { useEffect, useState, useCallback } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { RecognitionRecord } from "@/hooks/useImageHistory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Clock, Eye, Loader2, Trash2, X, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface HistoryTableProps {
  records: RecognitionRecord[];
  loading: boolean;
  error: string | null;
  selectedRecords: string[];
  setSelectedRecords: (ids: string[]) => void;
  onDeleteSelected: (ids?: string[]) => Promise<void>;
}
const placeholderSvgBase64 =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e5e7eb'/%3E%3C/svg%3E";

export function HistoryTable({
  records,
  loading,
  error,
  selectedRecords,
  setSelectedRecords,
  onDeleteSelected,
}: HistoryTableProps) {
  const [showSelectionBar, setShowSelectionBar] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<RecognitionRecord | null>(null);
  const [deletingRecords, setDeletingRecords] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  // 使用useEffect监听selectedRecords变化，添加过渡效果
  useEffect(() => {
    if (selectedRecords.length > 0 && !showSelectionBar) {
      setShowSelectionBar(true);
    } else if (selectedRecords.length === 0 && showSelectionBar) {
      // 延迟隐藏选择栏，以便有时间进行过渡动画
      const timer = setTimeout(() => {
        setShowSelectionBar(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedRecords, showSelectionBar]);

  // 处理选择记录
  const toggleRecordSelection = useCallback(
    (id: string) => {
      if (selectedRecords.includes(id)) {
        setSelectedRecords(selectedRecords.filter((recordId) => recordId !== id));
      } else {
        setSelectedRecords([...selectedRecords, id]);
      }
    },
    [selectedRecords, setSelectedRecords]
  );

  // 处理全选
  const toggleSelectAll = useCallback(() => {
    if (selectedRecords.length === records.length && records.length > 0) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.map((item) => item.id));
    }
  }, [records, selectedRecords, setSelectedRecords]);

  // 删除单条记录
  const handleDeleteSingle = useCallback(
    async (id: string) => {
      const confirmed = window.confirm("确定要删除这条记录吗？此操作不可撤销。");
      if (confirmed) {
        setDeletingRecords((prev) => new Set(prev).add(id));
        try {
          await onDeleteSelected([id]);
        } finally {
          setDeletingRecords((prev) => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
        }
      }
    },
    [onDeleteSelected]
  );
  const handleImageError = useCallback((imageUrl: string | null) => {
    if (imageUrl) {
      setFailedImages((prev) => new Set(prev).add(imageUrl));
    }
  }, []);

  const hasImageFailed = useCallback(
    (imageUrl: string | null) => {
      if (!imageUrl) return true;
      return failedImages.has(imageUrl);
    },
    [failedImages]
  );

  const getImageSource = useCallback(
    (imageUrl: string | null) => {
      if (!imageUrl || hasImageFailed(imageUrl)) {
        return placeholderSvgBase64;
      }
      return convertFileSrc(imageUrl);
    },
    [hasImageFailed]
  );
  // 打开记录详情
  const openRecordDetails = useCallback((record: RecognitionRecord) => {
    setViewingRecord(record);
  }, []);

  // 关闭记录详情
  const closeRecordDetails = useCallback(() => {
    setViewingRecord(null);
  }, []);

  // 获取状态徽章样式
  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className='bg-green-500 hover:bg-green-600 text-white border-0'>成功</Badge>
        );
      case "failed":
        return <Badge className='bg-red-500 hover:bg-red-600 text-white border-0'>失败</Badge>;
      case "processing":
        return (
          <Badge className='bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'>
            <RefreshCw className='h-3 w-3 mr-1 animate-spin' />
            处理中
          </Badge>
        );
      case "pending":
        return <Badge variant='outline'>待处理</Badge>;
      case "error":
        return <Badge variant='destructive'>错误</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }, []);

  // 格式化置信度显示
  const formatConfidence = useCallback((confidence: number | null) => {
    if (confidence === null) return "-";
    return `${(confidence * 100).toFixed(1)}%`;
  }, []);

  // 格式化结果显示
  const formatResult = useCallback((result: any) => {
    if (!result) return <span className='text-muted-foreground italic'>无结果</span>;

    if (typeof result === "object") {
      // 处理对象类型的结果，例如识别结果可能包含prediction字段
      if (result.prediction) {
        return result.prediction;
      }
      // 如果是数组，尝试取第一项
      if (Array.isArray(result) && result.length > 0) {
        return result[0].label || JSON.stringify(result[0]);
      }
      // 尝试获取结果中的第一个字段
      const firstKey = Object.keys(result)[0];
      if (firstKey) {
        return `${firstKey}: ${JSON.stringify(result[firstKey]).substring(0, 20)}...`;
      }
      return JSON.stringify(result).substring(0, 30) + "...";
    }

    return String(result);
  }, []);

  if (loading && records.length === 0) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
        <span className='ml-2'>加载中...</span>
      </div>
    );
  }

  if (error && records.length === 0) {
    return (
      <div className='flex items-center justify-center h-64 text-destructive'>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`flex items-center justify-between p-2 border-b bg-amber-50/50 transition-all duration-300 ${
          showSelectionBar ? "opacity-100 max-h-12" : "opacity-0 max-h-0 overflow-hidden"
        }`}>
        <span className='text-sm font-medium'>已选择 {selectedRecords.length} 项</span>
        <div className='flex gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setSelectedRecords([])}
            className='h-8 px-2 text-sm'>
            <X className='h-4 w-4 mr-1' />
            取消选择
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => onDeleteSelected(selectedRecords)}
            disabled={loading || selectedRecords.length === 0}
            className='h-8 px-2 text-sm'>
            {loading ? (
              <>
                <Loader2 className='h-4 w-4 mr-1 animate-spin' />
                删除中...
              </>
            ) : (
              <>
                <Trash2 className='h-4 w-4 mr-1' />
                删除所选
              </>
            )}
          </Button>
        </div>
      </div>

      <div className='overflow-x-auto'>
        <Table>
          <TableHeader className='bg-muted/30'>
            <TableRow>
              <TableHead className='w-[40px]'>
                <input
                  type='checkbox'
                  checked={selectedRecords.length === records.length && records.length > 0}
                  onChange={toggleSelectAll}
                  className='h-4 w-4 rounded border-gray-300'
                />
              </TableHead>
              <TableHead className='w-[80px]'>图像</TableHead>
              <TableHead className='w-[120px]'>任务ID</TableHead>
              <TableHead className='w-[180px]'>时间</TableHead>
              <TableHead>使用模型</TableHead>
              <TableHead>识别结果</TableHead>
              <TableHead className='w-[100px]'>置信度</TableHead>
              <TableHead className='w-[100px]'>状态</TableHead>
              <TableHead className='w-[80px] text-center'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length > 0 ? (
              records.map((record) => (
                <TableRow key={record.id} className='hover:bg-muted/10'>
                  <TableCell>
                    <input
                      type='checkbox'
                      checked={selectedRecords.includes(record.id)}
                      onChange={() => toggleRecordSelection(record.id)}
                      className='h-4 w-4 rounded border-gray-300'
                    />
                  </TableCell>
                  <TableCell>
                    <div className='h-10 w-10 rounded-md overflow-hidden border bg-muted/10'>
                      <img
                        src={getImageSource(record.imageUrl)}
                        alt='识别图像'
                        className='h-full w-full object-cover'
                        onError={() => handleImageError(record.imageUrl)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className='font-mono text-xs'>
                    {record.id.substring(0, 10)}...
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-col'>
                      <span className='text-xs flex items-center'>
                        <Calendar className='h-3 w-3 mr-1' />
                        {format(record.timestamp, "yyyy-MM-dd")}
                      </span>
                      <span className='text-xs text-muted-foreground flex items-center'>
                        <Clock className='h-3 w-3 mr-1' />
                        {format(record.timestamp, "HH:mm:ss")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className='max-w-[150px] truncate' title={record.model}>
                    {record.model}
                  </TableCell>
                  <TableCell
                    className='max-w-[200px] truncate'
                    title={
                      typeof record.result === "object"
                        ? JSON.stringify(record.result)
                        : String(record.result || "")
                    }>
                    {formatResult(record.result)}
                  </TableCell>
                  <TableCell>
                    {record.confidence ? (
                      <div className='flex flex-col'>
                        <span className='font-medium'>
                          {formatConfidence(record.confidence)}
                        </span>
                        <div className='w-16 h-1.5 bg-muted rounded-full overflow-hidden'>
                          <div
                            className='h-full bg-primary'
                            style={{ width: `${record.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className='text-muted-foreground'>-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell className='text-center'>
                    <div className='flex space-x-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        title='查看详情'
                        onClick={() => openRecordDetails(record)}
                        className='h-8 w-8'>
                        <Eye className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        title='删除记录'
                        onClick={() => handleDeleteSingle(record.id)}
                        disabled={deletingRecords.has(record.id) || loading}
                        className='h-8 w-8 text-destructive hover:text-destructive'>
                        {deletingRecords.has(record.id) ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <Trash2 className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className='h-32 text-center'>
                  <div className='flex flex-col items-center justify-center space-y-2'>
                    <div className='text-muted-foreground'>没有找到匹配的记录</div>
                    <div className='text-xs text-muted-foreground'>请尝试调整筛选条件</div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 记录详情对话框 */}
      <Dialog open={!!viewingRecord} onOpenChange={(open) => !open && closeRecordDetails()}>
        <DialogContent className='max-w-4xl'>
          <DialogHeader>
            <DialogTitle>历史记录详情</DialogTitle>
            <DialogDescription>
              {viewingRecord && format(viewingRecord.timestamp, "yyyy-MM-dd HH:mm:ss")}
            </DialogDescription>
          </DialogHeader>

          {viewingRecord && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-4'>
                <div>
                  <h3 className='text-sm font-medium mb-2'>图像</h3>
                  <div className='rounded border p-1 bg-muted/10'>
                    <img
                      src={getImageSource(viewingRecord.imageUrl)}
                      alt='识别图像'
                      className='h-full w-full object-cover'
                      onError={() => handleImageError(viewingRecord.imageUrl)}
                    />
                  </div>
                </div>

                <div>
                  <h3 className='text-sm font-medium mb-2'>图像信息</h3>
                  <div className='rounded border p-3 space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>原始文件名:</span>
                      <span>{viewingRecord.originalFileName || "未知"}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>文件大小:</span>
                      <span>
                        {viewingRecord.fileSize
                          ? `${(viewingRecord.fileSize / 1024).toFixed(1)} KB`
                          : "未知"}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>文件格式:</span>
                      <span>{viewingRecord.fileFormat || "未知"}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>图像ID:</span>
                      <span className='font-mono text-xs'>{viewingRecord.imageId}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className='space-y-4'>
                <div>
                  <h3 className='text-sm font-medium mb-2'>识别信息</h3>
                  <div className='rounded border p-3 space-y-2 text-sm'>
                    <div className='flex justify-between items-center'>
                      <span className='text-muted-foreground'>状态:</span>
                      {getStatusBadge(viewingRecord.status)}
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>使用模型:</span>
                      <span>{viewingRecord.model}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>置信度:</span>
                      <span>{formatConfidence(viewingRecord.confidence)}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>处理时间:</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>记录ID:</span>
                      <span className='font-mono text-xs'>{viewingRecord.id}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className='text-sm font-medium mb-2'>识别结果</h3>
                  <div className='rounded border p-3'>
                    {viewingRecord.result ? (
                      <pre className='text-xs overflow-auto max-h-[200px] whitespace-pre-wrap'>
                        {typeof viewingRecord.result === "object"
                          ? JSON.stringify(viewingRecord.result, null, 2)
                          : String(viewingRecord.result)}
                      </pre>
                    ) : (
                      <p className='text-muted-foreground'>无识别结果</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant='outline' onClick={closeRecordDetails}>
              关闭
            </Button>
            {viewingRecord && (
              <Button
                variant='destructive'
                onClick={() => {
                  closeRecordDetails();
                  handleDeleteSingle(viewingRecord.id);
                }}
                disabled={loading}>
                删除记录
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
