use crate::config::constants;
use crate::db::images_collection::ImageRepository;
use crate::models::inference_result::SaveImageResult;
use crate::utils::file;
use std::fs;
use std::path::PathBuf;
use tauri::{command, AppHandle, Manager};
/// 获取上传目录 - 优先使用应用数据目录
fn get_upload_dir(app_handle: &AppHandle) -> Result<(PathBuf, String), String> {
    let upload_dir_name = &constants::get_config().upload_dir;

    // 优先级顺序：
    // 1. 应用数据目录（最佳实践）
    // 2. 当前工作目录（开发模式）
    // 3. 资源目录（可能只读）

    // 首先尝试使用应用数据目录
    if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
        let upload_dir = app_data_dir.join(upload_dir_name);
        if fs::create_dir_all(&upload_dir).is_ok() {
            return Ok((upload_dir, upload_dir_name.to_string()));
        }
    }

    // 其次尝试使用当前工作目录（适用于开发环境）
    if let Ok(current_dir) = std::env::current_dir() {
        let upload_dir = current_dir.join(upload_dir_name);
        if fs::create_dir_all(&upload_dir).is_ok() {
            return Ok((upload_dir, upload_dir_name.to_string()));
        }
    }

    // 最后尝试使用可写的临时目录
    let temp_dir = std::env::temp_dir()
        .join("com.vision-match.app")
        .join(upload_dir_name);
    if fs::create_dir_all(&temp_dir).is_ok() {
        return Ok((temp_dir, format!("temp/{}", upload_dir_name)));
    }

    // 如果所有尝试都失败，返回错误
    Err("无法创建上传目录，请检查应用权限".to_string())
}

#[command]
pub async fn save_uploaded_image(
    app_handle: AppHandle,
    file_data: Vec<u8>,
    file_name: String,
) -> Result<SaveImageResult, String> {
    // 1. 计算文件哈希值 - 使用工具类中的SHA-256算法
    let hash = file::calculate_file_hash(&file_data);

    // 2. 检查数据库中是否已存在相同哈希的图片
    let existing_image = ImageRepository::find_by_hash(&hash)
        .await
        .map_err(|e| format!("查询数据库失败: {}", e))?;

    // 如果图片已存在，直接返回已存在的信息
    if let Some(image) = existing_image {
        let image_id = image.id.unwrap_or_default().to_string();
        let file_path = image.storage_path.unwrap_or_else(|| "未知路径".to_string());
        if let Err(e) = ImageRepository::update_image(&image_id, None, None)
            .await
            .map_err(|e| format!("更新时间戳失败: {}", e))
        {
            // 仅记录错误，但不阻止整个操作
            println!("警告: 更新图片时间戳失败: {}", e);
        }
        return Ok(SaveImageResult {
            file_path,
            image_id,
        });
    }

    // 3. 获取文件扩展名和不带扩展的原名
    let (name, ext) = file::split_filename(&file_name);
    // 使用哈希值前16位作为文件名
    let new_file_name = format!("{}.{}", &hash[..16], ext);
    // 4. 获取上传目录和相对路径
    let (upload_dir, upload_dir_rel) = get_upload_dir(&app_handle)?;
    // 5. 保存文件
    let file_path: PathBuf = upload_dir.join(&new_file_name);
    print!("保存文件到: {:?}", &file_path);
    fs::write(&file_path, file_data).map_err(|e| e.to_string())?;

    // 创建相对路径用于存储到数据库
    let relative_path = format!("{}/{}", upload_dir_rel, new_file_name);
    // 6. 提取文件大小
    let file_size = fs::metadata(&file_path)
        .map(|metadata| metadata.len() as i32)
        .ok();

    // 7. 保存到数据库 - 使用相对路径
    let image_id = ImageRepository::add_image(
        &hash,
        &new_file_name,
        Some(&name),          // 原始文件名
        Some(&relative_path), // 存储相对路径
        None,                 // 暂无图片URL
        file_size,            // 文件大小
        Some(&ext),           // 文件格式
        None,                 // 暂无标签
    )
    .await
    .map_err(|e| format!("保存到数据库失败: {}", e))?;

    // 8. 返回结果 - 返回给前端的仍是绝对路径，方便前端直接访问
    Ok(SaveImageResult {
        file_path: relative_path,
        image_id: image_id.to_string(),
    })
}
