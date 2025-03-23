use serde::{Deserialize, Serialize};
use serde_json::Value;
/// API返回的历史记录DTO（数据传输对象）
#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryDto {
    /// 记录ID - 直接使用字符串，而非BSON格式
    pub id: String,
    /// 创建时间 - 从MongoDB日期转换为ISO标准格式
    pub created_at: i64,
    /// 关联图片ID - 字符串格式
    pub image_id: String,
    /// 模型名称
    pub model_name: String,
    /// 识别结果 (如果有)
    pub result: Option<Value>,
    /// 结果置信度
    pub confidence: Option<f64>,
    /// 状态
    pub status: String,
    /// 错误信息(如果有)
    pub error_message: Option<String>,
}

/// 图片信息DTO
#[derive(Debug, Serialize, Deserialize)]
pub struct ImageDto {
    /// ID - 字符串格式
    pub id: String,
    /// 原始文件名
    pub original_file_name: Option<String>,
    /// 图片URL，相对地址
    pub image_url: Option<String>,
    /// 文件大小
    pub file_size: Option<i32>,
    /// 图片格式
    pub format: Option<String>,
}

/// API返回的完整历史记录（含图片信息）
#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryWithImageDto {
    pub history: HistoryDto,
    pub image: Option<ImageDto>,
}
