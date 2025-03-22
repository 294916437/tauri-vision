"use client";

import { useState, useEffect } from "react";

// 历史记录类型定义
export interface RecognitionRecord {
  id: string;
  timestamp: Date;
  imageUrl: string;
  model: string;
  result: string | null;
  confidence: number | null;
  status: "成功" | "失败" | "处理中";
  processingTime: number | null;
}

// 分页参数类型
export interface PaginationParams {
  page: number;
  limit: number;
}

// 过滤参数类型
export interface FilterParams {
  searchTerm?: string;
  status?: string;
  model?: string;
  sortBy?: "newest" | "oldest" | "confidence";
  startDate?: Date;
  endDate?: Date;
}

// 响应类型
interface HistoryResponse {
  records: RecognitionRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 统计数据类型
export interface HistoryStats {
  total: number;
  success: number;
  failed: number;
  processing: number;
  avgConfidence: number;
  modelDistribution: Record<string, number>;
}

export function useHistory() {
  const [records, setRecords] = useState<RecognitionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 10,
  });
  const [filters, setFilters] = useState<FilterParams>({});
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState<HistoryStats | null>(null);

  // 模拟获取历史记录数据
  const fetchHistory = async (
    paginationParams: PaginationParams,
    filterParams: FilterParams
  ) => {
    setLoading(true);
    setError(null);

    try {
      // 在实际应用中，这里会调用API获取数据
      // 模拟API调用延迟
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 生成模拟数据
      const models = ["通用识别模型", "物体检测模型", "场景分类模型", "文字识别模型"];
      const statuses = ["成功", "失败", "处理中"];
      const confidences = [0.98, 0.87, 0.76, 0.92, 0.65, 0.88, 0.79, 0.94];

      // 生成50条模拟记录
      const mockData: RecognitionRecord[] = Array.from({ length: 50 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));

        const status = statuses[Math.floor(Math.random() * statuses.length)] as
          | "成功"
          | "失败"
          | "处理中";
        const confidence =
          status === "成功"
            ? confidences[Math.floor(Math.random() * confidences.length)]
            : null;

        return {
          id: `task-${i + 1000}`,
          timestamp: date,
          imageUrl: `/placeholder.svg?height=80&width=80`,
          model: models[Math.floor(Math.random() * models.length)],
          result:
            status === "成功"
              ? ["猫", "宠物", "哺乳动物"][Math.floor(Math.random() * 3)]
              : null,
          confidence: confidence,
          status: status,
          processingTime: status === "成功" ? Math.floor(Math.random() * 5000) + 500 : null,
        };
      });

      // 应用过滤
      let filteredData = [...mockData];

      if (filterParams.searchTerm) {
        const term = filterParams.searchTerm.toLowerCase();
        filteredData = filteredData.filter(
          (item) =>
            item.id.toLowerCase().includes(term) ||
            (item.result && item.result.toLowerCase().includes(term))
        );
      }

      if (filterParams.status && filterParams.status !== "all") {
        filteredData = filteredData.filter((item) => item.status === filterParams.status);
      }

      if (filterParams.model && filterParams.model !== "all") {
        filteredData = filteredData.filter((item) => item.model === filterParams.model);
      }

      if (filterParams.startDate) {
        filteredData = filteredData.filter((item) => item.timestamp >= filterParams.startDate!);
      }

      if (filterParams.endDate) {
        filteredData = filteredData.filter((item) => item.timestamp <= filterParams.endDate!);
      }

      // 应用排序
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

      // 计算分页
      const total = filteredData.length;
      const totalPages = Math.ceil(total / paginationParams.limit);
      const startIndex = (paginationParams.page - 1) * paginationParams.limit;
      const paginatedData = filteredData.slice(startIndex, startIndex + paginationParams.limit);

      // 计算统计数据
      const statsData: HistoryStats = {
        total: mockData.length,
        success: mockData.filter((item) => item.status === "成功").length,
        failed: mockData.filter((item) => item.status === "失败").length,
        processing: mockData.filter((item) => item.status === "处理中").length,
        avgConfidence:
          mockData
            .filter((item) => item.confidence)
            .reduce((sum, item) => sum + (item.confidence || 0), 0) /
          mockData.filter((item) => item.confidence).length,
        modelDistribution: models.reduce((acc, model) => {
          acc[model] = mockData.filter((item) => item.model === model).length;
          return acc;
        }, {} as Record<string, number>),
      };

      // 返回结果
      const response: HistoryResponse = {
        records: paginatedData,
        total,
        page: paginationParams.page,
        limit: paginationParams.limit,
        totalPages,
      };

      setRecords(response.records);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setStats(statsData);
    } catch (err) {
      setError("获取历史记录失败，请稍后重试");
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  };

  // 当分页或过滤条件变化时获取数据
  useEffect(() => {
    fetchHistory(pagination, filters);
  }, [pagination, filters]);

  // 更新分页
  const updatePagination = (newPagination: Partial<PaginationParams>) => {
    setPagination((prev) => ({ ...prev, ...newPagination }));
  };

  // 更新过滤条件
  const updateFilters = (newFilters: Partial<FilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    // 重置到第一页
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // 删除记录
  const deleteRecords = async (ids: string[]) => {
    setLoading(true);
    try {
      // 在实际应用中，这里会调用API删除记录
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 模拟删除成功
      setRecords((prev) => prev.filter((record) => !ids.includes(record.id)));
      setTotal((prev) => prev - ids.length);

      return true;
    } catch (err) {
      setError("删除记录失败，请稍后重试");
      console.error("Error deleting records:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

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
    refreshData: () => fetchHistory(pagination, filters),
  };
}
