use crate::config::constants;
use crate::db::images_collection::ImageRepository;
use crate::models::inference_result::SaveImageResult;
use crate::utils::file; // 导入工具类
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use tauri::{command, AppHandle, Manager};
/// 获取上传目录
fn get_upload_dir(app_handle: &AppHandle) -> Result<(PathBuf, String), String> {
    let upload_dir_rel = &constants::get_config().upload_dir;

    // 获取可能的基础目录
    let base_dirs = [
        std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")),
        app_handle
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from(".")),
        app_handle
            .path()
            .resource_dir()
            .unwrap_or_else(|_| PathBuf::from(".")),
    ];

    // 使用第一个存在的目录或创建一个
    for base_dir in &base_dirs {
        let dir = base_dir.join(&upload_dir_rel);
        if dir.exists() || fs::create_dir_all(&dir).is_ok() {
            return Ok((dir, upload_dir_rel.to_string()));
        }
    }

    // 如果都失败了，返回当前目录下的uploads
    Ok((PathBuf::from(&upload_dir_rel), upload_dir_rel.to_string()))
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

    // 3. 获取文件扩展名并创建新文件名
    let extension = file::get_file_extension(&file_name).unwrap_or("unknown");
    let new_file_name = format!("{}.{}", &hash[..16], extension); // 使用哈希值前16位作为文件名
    let original_file_name_without_ext = Path::new(&file_name)
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or(&file_name)
        .to_string();
    // 4. 获取上传目录和相对路径
    let (upload_dir, upload_dir_rel) = get_upload_dir(&app_handle)?;

    // 5. 保存文件
    let file_path: PathBuf = upload_dir.join(&new_file_name);
    fs::write(&file_path, file_data).map_err(|e| e.to_string())?;

    // 创建相对路径用于存储到数据库
    let relative_path = format!("{}/{}", upload_dir_rel, new_file_name);

    // 确保路径分隔符统一 (适用于跨平台)
    let relative_path = relative_path.replace("\\", "/");

    // 6. 提取文件大小
    let file_size = fs::metadata(&file_path)
        .map(|metadata| metadata.len() as i32)
        .ok();

    // 7. 保存到数据库 - 使用相对路径
    let image_id = ImageRepository::add_image(
        &hash,
        &new_file_name,
        Some(&original_file_name_without_ext), // 原始文件名
        Some(&relative_path),                  // 存储相对路径而非绝对路径
        None,                                  // 暂无图片URL
        file_size,                             // 文件大小
        Some(extension),                       // 文件格式
        None,                                  // 暂无标签
    )
    .await
    .map_err(|e| format!("保存到数据库失败: {}", e))?;

    // 8. 返回结果 - 返回给前端的仍是绝对路径，方便前端直接访问
    Ok(SaveImageResult {
        file_path: relative_path,
        image_id: image_id.to_string(),
    })
}
