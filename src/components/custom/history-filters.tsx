"use client";

import { useState, useEffect, useCallback } from "react";
import type { FilterParams } from "@/hooks/useImageHistory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Search, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ModelInfo, ModelsState } from "@/lib/types";

interface HistoryFiltersProps {
  onFilterChange: (filters: Partial<FilterParams>) => void;
}

export function HistoryFilters({ onFilterChange }: HistoryFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "confidence">("newest");
  const [availableModels, setAvailableModels] = useState<ModelsState>({
    models: [],
    activeModelId: "",
    loading: true,
    error: null,
  });

  // 获取可用模型列表
  const fetchModels = useCallback(async () => {
    setAvailableModels((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // 调用后端API获取模型列表
      const result = await invoke<{
        models: ModelInfo[];
        active_model_id: string;
      }>("get_available_models");

      setAvailableModels({
        models: result.models || [],
        activeModelId: result.active_model_id || "",
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("获取模型列表失败:", error);
      setAvailableModels((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "获取模型列表失败",
      }));
    }
  }, []);

  // 组件挂载时获取模型列表
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // 应用所有筛选条件
  const applyFilters = useCallback(() => {
    const filters: Partial<FilterParams> = {};

    // 只在有实际筛选值时添加
    if (searchTerm) filters.searchTerm = searchTerm;
    if (statusFilter !== "all") filters.status = statusFilter;
    if (modelFilter !== "all") filters.model = modelFilter;

    // 只在不是默认排序时添加
    if (sortBy !== "newest") filters.sortBy = sortBy;

    onFilterChange(filters);
  }, [searchTerm, statusFilter, modelFilter, sortBy, onFilterChange]);

  // 当筛选条件变化时应用筛选
  useEffect(() => {
    applyFilters();
  }, [statusFilter, modelFilter, sortBy, applyFilters]);

  // 处理搜索 - 使用防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, applyFilters]);

  // 重置所有筛选条件
  const resetFilters = useCallback(() => {
    // 首先调用重置筛选条件
    onFilterChange({});
    // 使用setTimeout将状态更新推迟到下一个事件循环
    setTimeout(() => {
      setSearchTerm("");
      setStatusFilter("all");
      setModelFilter("all");
      setSortBy("newest");
    }, 0);
  }, [onFilterChange]);

  return (
    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
      <div className='flex items-center w-full sm:w-auto'>
        <div className='relative w-full sm:w-64'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            type='search'
            placeholder='搜索任务ID或结果...'
            className='pl-8 w-full'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <Button
              variant='ghost'
              size='icon'
              className='absolute right-0 top-0 h-9 w-9'
              onClick={() => setSearchTerm("")}>
              <X className='h-4 w-4' />
            </Button>
          )}
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <div className='flex items-center gap-2'>
          <Filter className='h-4 w-4 text-muted-foreground' />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='w-[120px]'>
              <SelectValue placeholder='全部状态' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部状态</SelectItem>
              <SelectItem value='success'>成功</SelectItem>
              <SelectItem value='failed'>失败</SelectItem>
              <SelectItem value='processing'>处理中</SelectItem>
              <SelectItem value='pending'>待处理</SelectItem>
              <SelectItem value='error'>错误</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className='w-[140px]'>
            <SelectValue placeholder='全部模型' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>全部模型</SelectItem>
            {availableModels.loading ? (
              <SelectItem value='loading' disabled>
                加载中...
              </SelectItem>
            ) : availableModels.models.length > 0 ? (
              availableModels.models.map((model) => (
                <SelectItem key={model.id} value={model.name}>
                  {model.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value='no-models' disabled>
                无可用模型
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className='w-[120px]'>
            <SelectValue placeholder='最新优先' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='newest'>最新优先</SelectItem>
            <SelectItem value='oldest'>最早优先</SelectItem>
            <SelectItem value='confidence'>置信度优先</SelectItem>
          </SelectContent>
        </Select>

        <Button variant='outline' size='sm' onClick={resetFilters} className='h-9'>
          重置筛选
        </Button>
      </div>
    </div>
  );
}
