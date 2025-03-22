use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelResult {
    /// 模型预测的主要结果类别
    pub prediction: String,

    /// 预测结果的置信度
    pub confidence: f32,

    /// 类别概率映射，包含置信度最高的N个类别
    pub class_probabilities: HashMap<String, f32>,

    /// 模型类型信息，可选
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
#[derive(Debug, Serialize, Deserialize)]
pub struct SaveHistoryResult {
    pub success: bool,
    pub message: String,
}
#[derive(Debug, Serialize, Deserialize)]
pub struct SaveImageResult {
    pub file_path: String, // 文件存储路径
    pub image_id: String,  // 数据库中的图片ID
}
