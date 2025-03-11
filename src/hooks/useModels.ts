import { useState, useEffect, useCallback } from "react";
import { ModelInfo, ModelsState } from "@/lib/types";
import { invoke } from "@tauri-apps/api/core";

export const useModels = () => {
  const [state, setState] = useState<ModelsState>({
    models: [],
    activeModelId: "",
    loading: true,
    error: null,
  });

  const fetchModels = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await invoke<{
        models: ModelInfo[];
        active_model_id: string;
      }>("get_available_models");

      setState({
        models: result.models,
        activeModelId: result.active_model_id,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("获取模型列表失败:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "获取模型列表失败",
      }));
    }
  }, []);

  const switchModel = useCallback(async (modelId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const model = await invoke<ModelInfo>("switch_model", { modelId });

      setState((prev) => ({
        ...prev,
        activeModelId: model.id,
        models: prev.models.map((m) => ({
          ...m,
          is_active: m.id === model.id,
        })),
        loading: false,
      }));

      return model;
    } catch (error) {
      console.error("切换模型失败:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "切换模型失败",
      }));
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models: state.models,
    activeModelId: state.activeModelId,
    activeModel: state.models.find((m) => m.id === state.activeModelId),
    loading: state.loading,
    error: state.error,
    fetchModels,
    switchModel,
  };
};
