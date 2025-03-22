"use client";

import { useState, useEffect, useCallback } from "react";
import { useHistory } from "@/hooks/useImageHistory";
import { HistoryTable } from "@/components/custom/history-table";
import { HistoryStats } from "@/components/custom/history-stats";
import { HistoryFilters } from "@/components/custom/history-filters";
import { HistoryPagination } from "@/components/custom/history-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Download, ImageIcon, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function ImageHistory() {
  const [selectedTab, setSelectedTab] = useState("list");
  const {
    records,
    loading,
    error,
    pagination,
    stats,
    updatePagination,
    updateFilters,
    deleteRecords,
    refreshData,
  } = useHistory();

  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 重置选择的记录
  useEffect(() => {
    setSelectedRecords([]);
  }, [records]);

  // 处理批量删除 - 使用useCallback优化性能
  const handleBulkDelete = useCallback(
    async (ids?: string[]) => {
      const recordsToDelete = ids || selectedRecords;

      if (recordsToDelete.length === 0) return;

      const confirmed = window.confirm(
        `确定要删除选定的 ${recordsToDelete.length} 条记录吗？此操作不可撤销。`
      );

      if (confirmed) {
        setDeleteLoading(true);
        try {
          const success = await deleteRecords(recordsToDelete);
          if (success) {
            // 如果是主动传入的IDs，不清空选择记录
            if (!ids) {
              setSelectedRecords([]);
            }
          }
        } finally {
          setDeleteLoading(false);
        }
      }
    },
    [selectedRecords, deleteRecords]
  );

  // 处理导出数据 - 使用useCallback优化性能
  const handleExport = useCallback(async () => {
    if (records.length === 0) return;

    setExportLoading(true);
    try {
      // 准备导出数据
      const exportData = records.map((record) => ({
        ID: record.id,
        日期: record.timestamp.toLocaleString(),
        模型: record.model,
        状态: getStatusText(record.status),
        置信度: record.confidence ? `${(record.confidence * 100).toFixed(2)}%` : "N/A",
        文件名: record.originalFileName || "N/A",
      }));

      // 转换为CSV
      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(","),
        ...exportData.map((row) =>
          headers.map((header) => JSON.stringify(row[header as keyof typeof row])).join(",")
        ),
      ];

      const csvContent = csvRows.join("\n");

      // 创建下载链接
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `历史记录_${new Date().toLocaleDateString()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理URL对象
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error("导出数据失败:", err);
      alert("导出数据失败，请稍后重试");
    } finally {
      setExportLoading(false);
    }
  }, [records]);

  // 处理刷新数据 - 使用useCallback优化性能
  const handleRefresh = useCallback(() => {
    setSelectedRecords([]); // 清除选择
    refreshData();
  }, [refreshData]);

  // 格式化显示范围文本 - 使用useMemo可以进一步优化，但这里简化处理
  const formatRangeText = useCallback(() => {
    const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    const total = pagination.total;

    return (
      <div className='text-sm text-muted-foreground whitespace-nowrap'>
        显示{" "}
        <span className='inline-block w-16 text-right font-mono'>
          {start}-{end}
        </span>{" "}
        条， 共 <span className='font-mono'>{total}</span> 条
      </div>
    );
  }, [pagination.page, pagination.limit, pagination.total]);

  // 处理分页变化 - 添加边界检查
  const handlePageChange = useCallback(
    (page: number) => {
      // 确保页码在有效范围内
      const validPage = Math.max(1, Math.min(page, pagination.totalPages || 1));
      if (validPage !== page) {
        console.warn(`页码 ${page} 超出范围，已调整为 ${validPage}`);
      }
      updatePagination({ page: validPage });
    },
    [pagination.totalPages, updatePagination]
  );

  // 处理每页条数变化
  const handleLimitChange = useCallback(
    (limit: number) => {
      updatePagination({ limit, page: 1 }); // 改变每页条数时重置到第一页
    },
    [updatePagination]
  );

  // 状态文本转换
  function getStatusText(status: string): string {
    switch (status) {
      case "success":
        return "成功";
      case "failed":
        return "失败";
      case "processing":
        return "处理中";
      case "pending":
        return "待处理";
      case "error":
        return "错误";
      default:
        return status;
    }
  }

  // UI部分保持不变，只更新处理函数和加入必要的loading状态
  return (
    <div className='container py-6'>
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className='w-full'>
        <div className='flex items-center justify-between mb-4'>
          <TabsList className='h-10 bg-muted/30 border'>
            <TabsTrigger
              value='list'
              className='flex items-center gap-2 px-4 h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm'>
              <ImageIcon className='h-4 w-4' />
              <span>记录列表</span>
            </TabsTrigger>
            <TabsTrigger
              value='stats'
              className='flex items-center gap-2 px-4 h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm'>
              <BarChart className='h-4 w-4' />
              <span>统计分析</span>
            </TabsTrigger>
          </TabsList>

          <Button
            variant='outline'
            size='sm'
            onClick={handleRefresh}
            disabled={loading}
            className='h-9 gap-1.5'>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>刷新数据</span>
          </Button>
        </div>

        {/* 错误信息显示 */}
        {error && (
          <Alert variant='destructive' className='mb-4'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>获取数据失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button variant='outline' size='sm' onClick={handleRefresh} className='mt-2'>
              重试
            </Button>
          </Alert>
        )}

        <TabsContent value='list' className='mt-0 space-y-4'>
          <div className='border rounded-md p-4'>
            <HistoryFilters onFilterChange={updateFilters} />
          </div>

          <div className='border rounded-md overflow-hidden'>
            {loading && records.length === 0 ? (
              <div className='p-4 space-y-3'>
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-20 w-full' />
                <Skeleton className='h-20 w-full' />
                <Skeleton className='h-20 w-full' />
              </div>
            ) : (
              <HistoryTable
                records={records}
                loading={loading || deleteLoading}
                error={error}
                selectedRecords={selectedRecords}
                setSelectedRecords={setSelectedRecords}
                onDeleteSelected={handleBulkDelete}
              />
            )}
          </div>

          <div className='border rounded-md py-3 px-4'>
            <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
              {formatRangeText()}

              <div className='flex items-center justify-center gap-4'>
                <HistoryPagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                  limit={pagination.limit}
                />

                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleExport}
                  disabled={exportLoading || records.length === 0}
                  className='h-9 gap-1.5'>
                  {exportLoading ? (
                    <>
                      <RefreshCw className='h-4 w-4 animate-spin' />
                      <span>导出中...</span>
                    </>
                  ) : (
                    <>
                      <Download className='h-4 w-4' />
                      <span>导出数据</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value='stats' className='mt-0'>
          <div className='p-4 border rounded-md'>
            {loading && !stats ? (
              <div className='space-y-4'>
                <Skeleton className='h-40 w-full' />
                <Skeleton className='h-60 w-full' />
              </div>
            ) : stats ? (
              <HistoryStats stats={stats} />
            ) : (
              <div className='text-center py-10 text-muted-foreground'>
                <p>暂无统计数据</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
