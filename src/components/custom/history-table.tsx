"use client";
import { useEffect, useState, useCallback } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { RecognitionRecord } from "@/lib/types";
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
import { ask } from "@tauri-apps/plugin-dialog";
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
  const [deletingRecords, setDeletingRecords] = useState<Set<string>>(new Set());
  // 图片加载状态处理
  const [imageCache] = useState<Map<string, string>>(new Map());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
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
      const confirmed = await ask("确定要删除这条记录吗？此操作不可撤销。", {
        title: "确认删除",
        kind: "warning",
        okLabel: "删除",
        cancelLabel: "取消",
      });

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

  // 批量删除记录
  const handleBulkDelete = useCallback(async () => {
    if (selectedRecords.length > 0) {
      const confirmed = await ask(
        `确定要删除选中的 ${selectedRecords.length} 条记录吗？此操作不可撤销。`,
        {
          title: "确认批量删除",
          kind: "warning",
          okLabel: "删除",
          cancelLabel: "取消",
        }
      );

      if (confirmed) {
        await onDeleteSelected(selectedRecords);
      }
    }
  }, [selectedRecords, onDeleteSelected]);
  //处理获取图片路径
  const getImageSource = useCallback(
    (imageUrl: string | null, recordId: string) => {
      // 1. 如果URL为空或已知错误，返回占位图
      if (!imageUrl || imageErrors.has(recordId)) {
        return placeholderSvgBase64;
      }

      // 2. 检查缓存
      if (imageCache.has(imageUrl)) {
        return imageCache.get(imageUrl)!;
      }
      try {
        // 3. 转换本地路径
        const convertedUrl = convertFileSrc(imageUrl);
        imageCache.set(imageUrl, convertedUrl);
        return convertedUrl;
      } catch (err) {
        console.error(`图片路径转换失败: ${imageUrl}`, err);
        return placeholderSvgBase64;
      }
    },
    [imageCache, imageErrors]
  );
  // 当记录列表变化时，重置可能已修复的图片错误
  useEffect(() => {
    if (records.length > 0 && imageErrors.size > 0) {
      // 仅检查有错误标记的记录
      const idsToCheck = Array.from(imageErrors);
      const updatedRecords = records.filter((r) => idsToCheck.includes(r.id));

      if (updatedRecords.length > 0) {
        setImageErrors((prev) => {
          const newErrors = new Set(prev);
          updatedRecords.forEach((record) => {
            // 如果记录的URL不为空，可能已修复，移除错误标记
            if (record.imageUrl) {
              newErrors.delete(record.id);
            }
          });
          return newErrors;
        });
      }
    }
  }, [records, imageErrors]);
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
            onClick={handleBulkDelete}
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
              <TableHead className='w-[150px]'>名称</TableHead>
              <TableHead className='w-[180px]'>时间</TableHead>
              <TableHead className='w-[200px]'>使用模型</TableHead>
              <TableHead className='w-[120px]'>识别结果</TableHead>
              <TableHead className='w-[100px]'>置信度</TableHead>
              <TableHead className='w-[100px]'>状态</TableHead>
              <TableHead className='w-[100px] text-center'>操作</TableHead>
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
                    <div className='h-10 w-10 rounded-md overflow-hidden border bg-muted/10 relative'>
                      <img
                        src={getImageSource(record.imageUrl, record.id)}
                        alt='识别图像'
                        className='h-full w-full object-cover'
                        loading='lazy'
                        onError={(e) => {
                          // 直接在失败时更新状态并显示占位图
                          setImageErrors((prev) => new Set(prev).add(record.id));
                          (e.target as HTMLImageElement).src = placeholderSvgBase64;
                          console.error(`图片加载失败: ${record.imageUrl}`);
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className='font-mono text-xs'>{record.originalFileName}</TableCell>
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
                        onClick={() => {}}
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
    </div>
  );
}
