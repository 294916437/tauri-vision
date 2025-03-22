import { useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ModelResult, RustModelResult } from "@/lib/types";

// 辅助函数
function isErrorResult(result: any): result is { error: string } {
  return result && typeof result.error === "string";
}

interface UploadedImage {
  filePath: string;
  imageId: string;
}

// 修改历史状态类型以匹配后端API
type HistoryStatus = "pending" | "processing" | "success" | "failed" | "error";

interface UseImageRecognitionReturn {
  isUploading: boolean;
  isProcessing: boolean;
  uploadedImage: UploadedImage | null;
  result: ModelResult | null;
  originalResult: RustModelResult | null;
  uploadImage: (file: File) => Promise<void>;
  processImage: () => Promise<void>;
  saveHistory: () => Promise<void>;
  error: string | null;
  historyStatus: HistoryStatus;
  resultSaved: boolean;
}

export function useImageRecognition(): UseImageRecognitionReturn {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  //前端展示的Result
  const [result, setResult] = useState<ModelResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>("pending");
  // 后端返回的原始的RustModelResult
  const [originalResult, setOriginalResult] = useState<RustModelResult | null>(null);
  // 添加状态追踪是否已保存 - 导出给组件使用
  const [resultSaved, setResultSaved] = useState<boolean>(false);
  // 添加一个ref来防止重复调用 - 内部使用，不会触发重渲染
  const saveInProgressRef = useRef<boolean>(false);

  /**
   * 步骤1: 上传图像 - 独立功能
   */
  const uploadImage = useCallback(async (file: File): Promise<void> => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    // 重置保存状态
    setResultSaved(false);

    try {
      // 转换为字节数组
      const fileData = await file.arrayBuffer();
      const fileBytes = new Uint8Array(fileData);

      // 调用上传API
      const uploadResult = await invoke<{ file_path: string; image_id: string }>(
        "save_uploaded_image",
        {
          fileData: Array.from(fileBytes),
          fileName: file.name,
        }
      );

      // 保存上传结果
      setUploadedImage({
        filePath: uploadResult.file_path,
        imageId: uploadResult.image_id,
      });

      console.log(`图像已上传: ID=${uploadResult.image_id}, 路径=${uploadResult.file_path}`);
    } catch (err: any) {
      console.error("图像上传失败:", err);
      const errorMessage = err?.message || err?.toString() || "上传失败，未知错误";
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * 步骤2: 处理图像 - 使用已上传的图像
   */
  const processImage = useCallback(async (): Promise<void> => {
    // 确保已上传图片
    if (!uploadedImage) {
      setError("请先上传图片");
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setOriginalResult(null); // 重置原始结果
    setError(null);
    setHistoryStatus("pending"); // 重置为待处理状态
    setResultSaved(false); // 重置保存状态
    saveInProgressRef.current = false; // 重置内部追踪标记

    try {
      // 调用处理API，使用已上传的图片路径
      const rustResult = await invoke<RustModelResult>("process_image", {
        imagePath: uploadedImage.filePath,
      });

      // 保存原始结果用于历史记录
      setOriginalResult(rustResult);

      // 处理结果
      if (isErrorResult(rustResult)) {
        const errorMsg = rustResult.error || "处理失败，未知错误";
        setError(errorMsg);
        setResult({ error: errorMsg });
      } else {
        // 将 class_probabilities 对象转换为排序后的数组格式
        const matches = Object.entries(rustResult.class_probabilities || {})
          .map(([label, confidence]) => ({
            label,
            confidence: confidence as number,
          }))
          .sort((a, b) => b.confidence - a.confidence);

        setResult({
          matches,
          topPrediction: {
            label: rustResult.prediction,
            confidence: rustResult.confidence,
          },
          modelType: rustResult.model_type,
        });
      }
    } catch (err: any) {
      console.error("图像处理失败:", err);
      const errorMessage = err?.message || err?.toString() || "处理失败，未知错误";
      setError(errorMessage);
      setResult({ error: `处理失败: ${errorMessage}` });
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedImage]);

  /**
   * 步骤3: 保存历史记录 - 可在任意时间调用
   * 使用useCallback包装，避免函数在每次渲染时都重新创建
   */
  const saveHistory = useCallback(async (): Promise<void> => {
    // 检查是否已经保存或正在保存中，避免重复调用
    if (resultSaved || saveInProgressRef.current) {
      console.log("历史记录已保存或正在保存中，跳过重复操作");
      return;
    }

    // 确保有上传图片和处理结果
    if (!uploadedImage || !originalResult) {
      console.warn("无法保存历史: 缺少图片信息或原始处理结果");
      return;
    }

    // 跳过有错误的处理结果
    if (isErrorResult(originalResult)) {
      console.warn("跳过保存错误结果到历史");
      setHistoryStatus("failed");
      setResultSaved(true);
      return;
    }

    // 标记为正在保存，这不会触发重渲染
    saveInProgressRef.current = true;
    // 设置UI状态
    setHistoryStatus("processing");

    try {
      console.log("开始保存历史记录");
      // 调用保存历史API
      const historyResult = await invoke<{ success: boolean; message: string }>(
        "save_image_history",
        {
          imageId: uploadedImage.imageId,
          modelName: originalResult.model_type || "default_model",
          result: originalResult,
          status: "success",
        }
      );

      if (historyResult.success) {
        console.log("历史记录保存成功:", historyResult.message);
        setHistoryStatus("success");
        // 标记为已保存
        setResultSaved(true);
      } else {
        console.warn("历史记录保存警告:", historyResult.message);
        setHistoryStatus("failed");
      }
    } catch (err) {
      console.error("保存历史记录失败:", err);
      setHistoryStatus("error");
    } finally {
      // 完成后，取消正在保存标记
      saveInProgressRef.current = false;
    }
  }, [uploadedImage, originalResult, resultSaved]);

  return {
    isUploading,
    isProcessing,
    uploadedImage,
    result,
    originalResult,
    uploadImage,
    processImage,
    saveHistory,
    error,
    historyStatus,
    resultSaved,
  };
}
