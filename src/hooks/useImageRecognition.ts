import { useState } from "react";
import { RustModelResult, isErrorResult, ModelResult, isInferenceResult } from "@/lib/types";
import { invoke } from "@tauri-apps/api/core";

interface UseImageRecognitionReturn {
  isProcessing: boolean;
  result: ModelResult | null;
  processImage: (file: File) => Promise<void>;
  error: string | null;
}

export function useImageRecognition(): UseImageRecognitionReturn {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<ModelResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processImage = async (file: File): Promise<void> => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // 将文件转换为字节数组
      const fileData = await file.arrayBuffer();
      const fileBytes = new Uint8Array(fileData);

      // 上传图像到Tauri后端 - 使用正确的参数结构
      const imagePath = await invoke<string>("save_uploaded_image", {
        fileData: Array.from(fileBytes),
        fileName: file.name,
      });

      console.log("图像保存路径:", imagePath);

      // 调用Rust后端进行图像处理
      const rustResult = await invoke<RustModelResult>("process_image", {
        imagePath,
      });

      console.log("处理结果:", rustResult);

      // 处理结果
      if (isErrorResult(rustResult)) {
        const errorMsg = rustResult.error || "处理失败，未知错误";
        setError(errorMsg);
        setResult({ error: errorMsg });
      } else if (isInferenceResult(rustResult)) {
        // 转换后端结果格式为前端使用的格式
        const matches = Object.entries(rustResult.class_probabilities)
          .map(([label, confidence]) => ({ label, confidence }))
          .sort((a, b) => b.confidence - a.confidence);

        setResult({
          matches,
          topPrediction: {
            label: rustResult.prediction,
            confidence: rustResult.confidence,
          },
        });
      } else {
        throw new Error("后端返回了无效的数据格式");
      }
    } catch (err: any) {
      console.error("图像识别过程中出错:", err);
      const errorMessage = err?.message || err?.toString() || "未知错误";
      setError(errorMessage);
      setResult({ error: `处理失败: ${errorMessage}` });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    result,
    processImage,
    error,
  };
}
