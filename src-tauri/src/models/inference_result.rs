use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TopPrediction {
    pub class: String,
    pub probability: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelResult {
    pub prediction: String,
    pub confidence: f32,
    pub top_predictions: Vec<TopPrediction>,
    // 可选字段，用于区分不同模型的结果
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub path: String,
    pub model_type: String,
    pub num_classes: u32,
    pub script_path: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AvailableModels {
    pub models: Vec<ModelInfo>,
    pub active_model_id: String,
}
