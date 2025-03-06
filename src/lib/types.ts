// 识别结果的匹配项
export interface Match {
  label: string;
  confidence: number;
}

// 本地模拟API使用的结果格式
export interface ModelResult {
  matches?: Match[];
  topPrediction?: Match; // 添加顶部预测结果
  error?: string;
}

// Rust后端返回的推理结果
export interface InferenceResult {
  prediction: string;
  confidence: number;
  class_probabilities: Record<string, number>;
}

// Rust后端返回的错误结果
export interface ErrorResult {
  error: string;
}

// Rust后端响应类型（成功或失败）
export type RustModelResult = InferenceResult | ErrorResult;

// 判断结果是否为错误类型
export function isErrorResult(result: any): result is ErrorResult {
  return result && typeof result === "object" && "error" in result;
}

// 判断结果是否为推理结果类型
export function isInferenceResult(result: any): result is InferenceResult {
  return (
    result &&
    typeof result === "object" &&
    "prediction" in result &&
    "confidence" in result &&
    "class_probabilities" in result
  );
}
