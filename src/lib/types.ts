// Rust后端图片识别返回的结果类型
export interface RustModelResult {
  prediction: string;
  confidence: number;
  class_probabilities: Record<string, number>;
  model_type?: string;
  error?: string;
}

// 完善RustModelResult接口，确保与后端返回值匹配
export interface RustModelResult {
  prediction: string;
  confidence: number;
  class_probabilities: Record<string, number>;
  model_type?: string;
  error?: string;
}
// 前端使用的类型
export interface ModelResult {
  matches?: {
    label: string;
    confidence: number;
  }[];
  topPrediction?: {
    label: string;
    confidence: number;
  };
  modelType?: string;
  error?: string;
}

// 辅助检查函数
export function isErrorResult(result: any): result is { error: string } {
  return result && typeof result.error === "string";
}

// 检查是否为有效的推理结果
export function isInferenceResult(result: any): result is RustModelResult {
  return (
    result &&
    typeof result.prediction === "string" &&
    typeof result.confidence === "number" &&
    Array.isArray(result.top_predictions)
  );
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  path: string;
  model_type: string;
  num_classes: number;
  script_path: string;
  is_active: boolean;
}

export interface ModelsState {
  models: ModelInfo[];
  activeModelId: string;
  loading: boolean;
  error: string | null;
}
// Rust后端返回的错误结果
export interface ErrorResult {
  error: string;
}
// 历史记录类型定义 - 与后端匹配
export interface RecognitionRecord {
  id: string;
  timestamp: Date;
  imageId: string;
  imageUrl: string | null;
  model: string;
  result: any | null; // 使用any类型匹配后端返回的复杂结构
  confidence: number | null;
  status: "pending" | "processing" | "success" | "failed" | "error";
  // 图片相关信息 - 来自后端关联
  originalFileName: string;
  fileSize: number;
  fileFormat: string;
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

// 统计数据类型
export interface HistoryStats {
  total: number;
  success: number;
  failed: number;
  processing: number;
  pending: number;
  error: number;
  avgConfidence: number;
  modelDistribution: Record<string, number>;
}
