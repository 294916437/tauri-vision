use crate::db::db_client::DbError;
use crate::db::histories_collection::{ImageHistory, ImageHistoryRepository, RecognitionStatus};
use crate::db::images_collection::{Image, ImageRepository};
use crate::models::dto::{HistoryDto, HistoryWithImageDto, ImageDto};
use crate::utils::network::get_main_mac_address;
use crate::utils::path_utils::to_absolute_path;
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::command;

// 错误转换辅助函数
fn map_db_error(err: DbError) -> String {
    format!("数据库错误: {}", err)
}

/// API返回的历史记录（含图片信息）
#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryWithImage {
    #[serde(flatten)]
    pub history: ImageHistory,
    pub image: Option<Image>,
}
/// 转换函数 - 从ImageHistory到HistoryDto
fn convert_to_history_dto(history: &ImageHistory) -> HistoryDto {
    HistoryDto {
        id: history.id.unwrap_or_default().to_string(),
        created_at: history.created_at.timestamp_millis(),
        image_id: history.image_id.to_string(),
        model_name: history.model_name.clone(),
        result: history.result.clone(),
        confidence: history.confidence,
        status: match history.status {
            RecognitionStatus::Pending => "pending".to_string(),
            RecognitionStatus::Processing => "processing".to_string(),
            RecognitionStatus::Success => "success".to_string(),
            RecognitionStatus::Failed => "failed".to_string(),
            RecognitionStatus::Error => "error".to_string(),
        },
        error_message: history.error_message.clone(),
    }
}

/// 转换函数 - 从Image到ImageDto
fn convert_to_image_dto(image: &Image) -> ImageDto {
    let image_url = image
        .storage_path
        .as_ref()
        .map(|path| to_absolute_path(path));

    ImageDto {
        id: image.id.unwrap_or_default().to_string(),
        original_file_name: image.original_name.clone(),
        image_url,
        file_size: image.file_size,
        format: image.format.clone(),
    }
}
/// 1. 保存图片信息到images集合
#[command]
pub async fn save_image(
    hash: String,
    image_name: String,
    original_name: Option<String>,
    storage_path: Option<String>,
    image_url: Option<String>,
    file_size: Option<i32>,
    format: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<String, String> {
    ImageRepository::add_image(
        &hash,
        &image_name,
        original_name.as_deref(),
        storage_path.as_deref(),
        image_url.as_deref(),
        file_size,
        format.as_deref(),
        tags,
    )
    .await
    .map(|id| id.to_string())
    .map_err(map_db_error)
}

/// 2. 添加图像识别历史记录到histories集合
#[command]
pub async fn add_image_history(
    image_id: String,
    model_name: String,
    status: Option<String>,
    result: Option<Value>,
    confidence: Option<f64>,
    error_message: Option<String>,
) -> Result<String, String> {
    let mac_address = get_main_mac_address();

    // 将字符串ID转换为ObjectId
    let oid = ObjectId::parse_str(&image_id).map_err(|_| format!("无效的图片ID: {}", image_id))?;

    // 将字符串状态转换为枚举（默认为Pending）
    let status_enum = if let Some(status_str) = status {
        match status_str.to_lowercase().as_str() {
            "pending" => RecognitionStatus::Pending,
            "processing" => RecognitionStatus::Processing,
            "success" => RecognitionStatus::Success,
            "failed" => RecognitionStatus::Failed,
            "error" => RecognitionStatus::Error,
            _ => return Err("无效的状态".to_string()),
        }
    } else {
        RecognitionStatus::Pending
    };

    ImageHistoryRepository::add_history(
        &mac_address,
        oid,
        &model_name,
        status_enum,
        result,
        confidence,
        error_message.as_deref(),
    )
    .await
    .map(|id| id.to_string())
    .map_err(map_db_error)
}

/// 3. 获取用户历史记录（带分页）并包含图片信息
#[command]
pub async fn get_user_history(
    limit: Option<u32>,
    skip: Option<u32>,
) -> Result<Vec<HistoryWithImageDto>, String> {
    let mac_address = get_main_mac_address();

    // 获取历史记录
    let histories = ImageHistoryRepository::find_by_mac_address(
        &mac_address,
        limit.map(|v| v as i64),
        skip.map(|v| v as u64),
    )
    .await
    .map_err(map_db_error)?;

    // 转换为DTO格式
    let mut results = Vec::with_capacity(histories.len());
    for history in histories {
        let image_id = history.image_id.to_string();
        let image = ImageRepository::find_by_id(&image_id)
            .await
            .map_err(map_db_error)?;

        let history_dto = convert_to_history_dto(&history);
        let image_dto = image.as_ref().map(convert_to_image_dto);

        results.push(HistoryWithImageDto {
            history: history_dto,
            image: image_dto,
        });
    }

    Ok(results)
}

#[command]
pub async fn get_history_by_model(
    model_name: String,
    limit: Option<u32>,
) -> Result<Vec<HistoryWithImageDto>, String> {
    let mac_address = get_main_mac_address();

    // 获取历史记录
    let histories = ImageHistoryRepository::find_by_model_and_mac(
        &mac_address,
        &model_name,
        limit.map(|v| v as i64),
    )
    .await
    .map_err(map_db_error)?;

    // 转换为DTO格式
    let mut results = Vec::with_capacity(histories.len());
    for history in histories {
        let image_id = history.image_id.to_string();
        let image = ImageRepository::find_by_id(&image_id)
            .await
            .map_err(map_db_error)?;

        let history_dto = convert_to_history_dto(&history);
        let image_dto = image.as_ref().map(convert_to_image_dto);

        results.push(HistoryWithImageDto {
            history: history_dto,
            image: image_dto,
        });
    }

    Ok(results)
}

/// 5. 更新历史记录状态
#[command]
pub async fn update_history_status(
    id: String,
    status: String,
    result: Option<Value>,
    confidence: Option<f64>,
    error_message: Option<String>,
) -> Result<bool, String> {
    // 将字符串状态转换为枚举
    let status_enum = match status.to_lowercase().as_str() {
        "pending" => RecognitionStatus::Pending,
        "processing" => RecognitionStatus::Processing,
        "success" => RecognitionStatus::Success,
        "failed" => RecognitionStatus::Failed,
        "error" => RecognitionStatus::Error,
        _ => return Err("无效的状态".to_string()),
    };

    ImageHistoryRepository::update_status(
        &id,
        status_enum,
        result,
        confidence,
        error_message.as_deref(),
    )
    .await
    .map_err(map_db_error)
}

/// 6. 删除历史记录
#[command]
pub async fn delete_history(id: String) -> Result<bool, String> {
    ImageHistoryRepository::delete_by_id(&id)
        .await
        .map_err(map_db_error)
}

/// 7. 根据状态获取历史记录
#[command]
pub async fn get_history_by_status(
    status: String,
    limit: Option<u32>,
) -> Result<Vec<HistoryWithImageDto>, String> {
    let mac_address = get_main_mac_address();

    // 将字符串状态转换为枚举
    let status_enum = match status.to_lowercase().as_str() {
        "pending" => RecognitionStatus::Pending,
        "processing" => RecognitionStatus::Processing,
        "success" => RecognitionStatus::Success,
        "failed" => RecognitionStatus::Failed,
        "error" => RecognitionStatus::Error,
        _ => return Err("无效的状态".to_string()),
    };

    // 获取历史记录
    let histories = ImageHistoryRepository::find_by_status_and_mac(
        &mac_address,
        status_enum,
        limit.map(|v| v as i64),
    )
    .await
    .map_err(map_db_error)?;

    // 转换为DTO格式
    let mut results = Vec::with_capacity(histories.len());
    for history in histories {
        let image_id = history.image_id.to_string();
        let image = ImageRepository::find_by_id(&image_id)
            .await
            .map_err(map_db_error)?;

        let history_dto = convert_to_history_dto(&history);
        let image_dto = image.as_ref().map(convert_to_image_dto);

        results.push(HistoryWithImageDto {
            history: history_dto,
            image: image_dto,
        });
    }

    Ok(results)
}

/// 9. 添加标签到图片
#[command]
pub async fn add_tags_to_image(id: String, tags: Vec<String>) -> Result<bool, String> {
    ImageRepository::add_tags(&id, &tags)
        .await
        .map_err(map_db_error)
}

/// 10. 获取历史记录总数
#[command]
pub async fn get_history_count() -> Result<u64, String> {
    let mac_address: String = get_main_mac_address();

    ImageHistoryRepository::count_by_mac_address(&mac_address)
        .await
        .map_err(map_db_error)
}

/// 11. 查找图片是否已存在(通过哈希)
#[command]
pub async fn find_image_by_hash(hash: String) -> Result<Option<String>, String> {
    let image = ImageRepository::find_by_hash(&hash)
        .await
        .map_err(map_db_error)?;

    Ok(image.map(|img| img.id.unwrap_or_default().to_string()))
}

/// 12. 获取最近上传的图片
#[command]
pub async fn get_recent_images(limit: Option<u32>) -> Result<Vec<Image>, String> {
    ImageRepository::find_recent(limit.map(|v| v as i64))
        .await
        .map_err(map_db_error)
}
