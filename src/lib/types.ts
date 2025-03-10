// 与后端匹配的类型
export interface TopPrediction {
  class: string;
  probability: number;
}

export interface RustModelResult {
  prediction: string;
  confidence: number;
  top_predictions: TopPrediction[];
  model_type?: string;
  error?: string; // 用于错误处理
}

// 前端使用的类型
export interface ModelResult {
  matches?: { label: string; confidence: number }[];
  topPrediction?: { label: string; confidence: number };
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
