use crate::utils::env_utils::get_env_var;
use std::fs;
use std::path::PathBuf;
use tauri::{command, AppHandle, Manager};

/// 获取上传目录
fn get_upload_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let upload_dir_rel = get_env_var("UPLOAD_DIR", "uploads");

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
            return Ok(dir);
        }
    }

    // 如果都失败了，返回当前目录下的uploads
    Ok(PathBuf::from(&upload_dir_rel))
}

#[command]
pub async fn save_uploaded_image(
    app_handle: AppHandle,
    file_data: Vec<u8>,
    file_name: String,
) -> Result<String, String> {
    // 获取上传目录
    let upload_dir = get_upload_dir(&app_handle)?;

    // 保存文件
    let file_path = upload_dir.join(&file_name);
    fs::write(&file_path, file_data).map_err(|e| e.to_string())?;

    // 返回绝对路径
    Ok(file_path.to_str().unwrap_or(&file_name).to_string())
}
