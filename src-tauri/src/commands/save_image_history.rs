use crate::db::histories_collection::{ImageHistoryRepository, RecognitionStatus};
use crate::models::inference_result::ModelResult;
use crate::utils::network::get_main_mac_address; // 导入网络工具类
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use tauri::command;

/// 历史记录保存结果
#[derive(Debug, Serialize, Deserialize)]
pub struct SaveHistoryResult {
    pub success: bool,
    pub message: String,
}

/// 保存图像识别历史记录
#[command]
pub async fn save_image_history(
    image_id: String,
    model_name: String,
    result: Option<ModelResult>,
    status: Option<String>,
    error_message: Option<String>,
) -> Result<SaveHistoryResult, String> {
    // 1. 参数校验
    let image_oid =
        ObjectId::parse_str(&image_id).map_err(|_| format!("无效的图像ID: {}", image_id))?;

    // 获取MAC地址或使用默认值 - 使用工具类函数
    let mac = get_main_mac_address();

    // 确定识别状态
    let recognition_status = match status.as_deref() {
        Some("pending") => RecognitionStatus::Pending,
        Some("processing") => RecognitionStatus::Processing,
        Some("success") => RecognitionStatus::Success,
        Some("failed") => RecognitionStatus::Failed,
        Some("error") => RecognitionStatus::Error,
        Some(invalid) => return Err(format!("无效的状态值: {}", invalid)),
        None => {
            if result.is_some() {
                RecognitionStatus::Success
            } else if error_message.is_some() {
                RecognitionStatus::Failed
            } else {
                RecognitionStatus::Pending
            }
        }
    };

    // 2. 准备结果值
    let result_value = match &result {
        Some(model_result) => {
            // 将ModelResult序列化为serde_json::Value
            Some(
                serde_json::to_value(model_result)
                    .map_err(|e| format!("序列化识别结果失败: {}", e))?,
            )
        }
        None => None,
    };

    // 3. 提取置信度
    let confidence = result.as_ref().map(|r| r.confidence as f64);

    // 4. 保存历史记录
    let save_result = ImageHistoryRepository::add_history(
        &mac,
        image_oid,
        &model_name,
        recognition_status,
        result_value,
        confidence,
        error_message.as_deref(),
    )
    .await;

    // 5. 处理结果
    match save_result {
        Ok(_) => Ok(SaveHistoryResult {
            success: true,
            message: "历史记录保存成功".to_string(),
        }),
        Err(e) => Ok(SaveHistoryResult {
            success: false,
            message: format!("历史记录保存失败: {}", e),
        }),
    }
}
