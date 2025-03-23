"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RecognitionRecord, PaginationParams, FilterParams, HistoryStats } from "@/lib/types";

export function useHistory() {
  const [records, setRecords] = useState<RecognitionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 5,
  });
  const [filters, setFilters] = useState<FilterParams>({});
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState<HistoryStats | null>(null);

  // 添加请求控制状态和上次请求参数的引用
  const isInitialLoadRef = useRef(true);
  const lastRequestParamsRef = useRef({
    page: pagination.page,
    limit: pagination.limit,
    filters: JSON.stringify(filters),
  });
  const pendingRequestRef = useRef(false);

  // 获取历史记录总数
  const fetchTotalCount = useCallback(async (limit: number) => {
    try {
      const count = await invoke<number>("get_history_count");
      setTotal(count);
      setTotalPages(Math.ceil(count / limit));
      return count;
    } catch (err) {
      console.error("获取历史记录总数失败:", err);
      return 0;
    }
  }, []);

  // 移除pagination和filters依赖，改为参数传递
  const fetchHistory = useCallback(
    async (
      paginationParams: PaginationParams,
      filterParams: FilterParams,
      shouldUpdateStats = true
    ) => {
      // 防止重复请求
      if (pendingRequestRef.current) {
        console.log("跳过重复请求");
        return;
      }

      pendingRequestRef.current = true;
      setLoading(true);
      setError(null);

      try {
        // 计算skip值 (分页偏移量)
        const skip = (paginationParams.page - 1) * paginationParams.limit;

        // 根据筛选条件选择不同的API调用
        let historyData;

        if (filterParams.status && filterParams.status !== "all") {
          // 按状态筛选
          historyData = await invoke<any[]>("get_history_by_status", {
            status: filterParams.status,
            limit: paginationParams.limit,
          });
        } else if (filterParams.model && filterParams.model !== "all") {
          // 按模型筛选
          historyData = await invoke<any[]>("get_history_by_model", {
            modelName: filterParams.model,
            limit: paginationParams.limit,
          });
        } else {
          // 基本分页查询
          historyData = await invoke<any[]>("get_user_history", {
            limit: paginationParams.limit,
            skip: skip,
          });
        }

        // 处理接收到的数据
        const processedRecords: RecognitionRecord[] = historyData.map((item) => {
          // 从后端对象转换为前端格式
          const history = item.history;
          const image = item.image;

          return {
            id: history.id, // 现在直接是字符串
            timestamp: new Date(history.created_at), // 直接是时间戳
            imageId: history.image_id, // 直接是字符串
            imageUrl: image?.image_url || null, // 直接使用后端生成的URL
            model: history.model_name,
            result: history.result,
            confidence: history.confidence || null,
            status: history.status,
            originalFileName: image?.original_file_name,
            fileSize: image?.file_size,
            fileFormat: image?.format,
          };
        });

        // 应用客户端筛选和排序
        let filteredData = [...processedRecords];

        // 关键词搜索
        if (filterParams.searchTerm) {
          const term = filterParams.searchTerm.toLowerCase();
          filteredData = filteredData.filter(
            (item) =>
              item.id.toLowerCase().includes(term) ||
              item.model.toLowerCase().includes(term) ||
              (item.originalFileName && item.originalFileName.toLowerCase().includes(term))
          );
        }

        // 日期范围筛选
        if (filterParams.startDate) {
          filteredData = filteredData.filter(
            (item) => item.timestamp >= filterParams.startDate!
          );
        }

        if (filterParams.endDate) {
          filteredData = filteredData.filter((item) => item.timestamp <= filterParams.endDate!);
        }

        // 排序
        if (filterParams.sortBy) {
          filteredData.sort((a, b) => {
            if (filterParams.sortBy === "newest")
              return b.timestamp.getTime() - a.timestamp.getTime();
            if (filterParams.sortBy === "oldest")
              return a.timestamp.getTime() - b.timestamp.getTime();
            if (filterParams.sortBy === "confidence" && a.confidence && b.confidence)
              return b.confidence - a.confidence;
            return 0;
          });
        }

        // 更新状态
        setRecords(filteredData);

        // 仅在以下情况更新总数:
        // 1. 初始加载
        // 2. 过滤条件变化
        // 3. 明确要求刷新
        if (
          isInitialLoadRef.current ||
          JSON.stringify(lastRequestParamsRef.current.filters) !==
            JSON.stringify(filterParams) ||
          shouldUpdateStats
        ) {
          await fetchTotalCount(paginationParams.limit);
        }

        // 更新最后一次请求参数引用
        lastRequestParamsRef.current = {
          page: paginationParams.page,
          limit: paginationParams.limit,
          filters: JSON.stringify(filterParams),
        };

        // 只在需要时更新统计数据 - 避免频繁调用
        if (shouldUpdateStats) {
          await calculateStats();
        }
      } catch (err) {
        setError("获取历史记录失败，请稍后重试");
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
        pendingRequestRef.current = false;
      }
    },
    [fetchTotalCount]
  );

  // 使用独立的API获取统计数据，而不是重复获取所有记录
  const calculateStats = useCallback(async () => {
    try {
      // 前端统计逻辑 - 但只在初始加载或明确要求时执行
      const allHistories = await invoke<any[]>("get_user_history", {
        limit: 1000, // 获取较大数量以便统计
        skip: 0,
      });

      // 转换数据格式
      const histories = allHistories.map((item) => ({
        model: item.history.model_name,
        status: item.history.status.toLowerCase(),
        confidence: item.history.confidence || 0,
      }));

      // 计算统计数据
      const statsData: HistoryStats = {
        total: histories.length,
        success: histories.filter((item) => item.status === "success").length,
        failed: histories.filter((item) => item.status === "failed").length,
        processing: histories.filter((item) => item.status === "processing").length,
        pending: histories.filter((item) => item.status === "pending").length,
        error: histories.filter((item) => item.status === "error").length,
        avgConfidence:
          histories
            .filter((item) => item.confidence > 0)
            .reduce((sum, item) => sum + item.confidence, 0) /
          (histories.filter((item) => item.confidence > 0).length || 1),
        modelDistribution: histories.reduce((acc, item) => {
          acc[item.model] = (acc[item.model] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      setStats(statsData);
    } catch (err) {
      console.error("计算统计数据失败:", err);
    }
  }, []);

  // 使用条件检查避免不必要的请求
  useEffect(() => {
    const currentParams = {
      page: pagination.page,
      limit: pagination.limit,
      filters: JSON.stringify(filters),
    };

    // 仅在以下情况执行请求：
    // 1. 首次加载
    // 2. 参数发生实际变化
    if (
      isInitialLoadRef.current ||
      JSON.stringify(lastRequestParamsRef.current) !== JSON.stringify(currentParams)
    ) {
      fetchHistory(pagination, filters, isInitialLoadRef.current);
      isInitialLoadRef.current = false;
    }
  }, [pagination, filters, fetchHistory]);

  // 更新分页
  const updatePagination = useCallback((newPagination: Partial<PaginationParams>) => {
    setPagination((prev) => ({ ...prev, ...newPagination }));
  }, []);

  // 更新过滤条件
  const updateFilters = useCallback((newFilters: Partial<FilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    // 重置到第一页
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  // 删除记录 - 保持原逻辑
  const deleteRecords = useCallback(
    async (ids: string[]) => {
      setLoading(true);
      try {
        let success = true;
        let failedIds: string[] = [];

        // 逐个删除记录
        for (const id of ids) {
          try {
            const result = await invoke<boolean>("delete_history", { id });
            if (!result) {
              success = false;
              failedIds.push(id);
              console.error(`删除记录 ${id} 失败`);
            }
          } catch (err) {
            success = false;
            failedIds.push(id);
            console.error(`删除记录 ${id} 发生错误:`, err);
          }
        }

        // 刷新数据 - 使用参数直接传递，避免依赖状态变量
        await fetchHistory(pagination, filters, false);
        await fetchTotalCount(pagination.limit);

        // 如果有部分失败，显示警告
        if (!success) {
          setError(`部分记录删除失败(${failedIds.length}/${ids.length})，请稍后重试`);
          return false;
        }

        return true;
      } catch (err) {
        setError("删除记录失败，请稍后重试");
        console.error("Error deleting records:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [pagination, filters, fetchHistory, fetchTotalCount]
  );

  // 明确的刷新数据函数，用于手动触发
  const refreshData = useCallback(() => {
    return fetchHistory(pagination, filters, true);
  }, [pagination, filters, fetchHistory]);

  return {
    records,
    loading,
    error,
    pagination: {
      ...pagination,
      total,
      totalPages,
    },
    stats,
    updatePagination,
    updateFilters,
    deleteRecords,
    refreshData,
  };
}
