use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// 将相对路径转换为绝对路径 - 不依赖AppHandle的简单版本
pub fn to_absolute_path(path: &str) -> String {
    if Path::new(path).is_absolute() {
        return path.to_string();
    }

    match std::env::current_dir() {
        Ok(current_dir) => current_dir.join(path).to_string_lossy().into_owned(),
        Err(_) => path.to_string(),
    }
}

/// 将相对路径解析到应用数据目录
pub fn resolve_app_path(app_handle: &AppHandle, relative_path: &str) -> Result<String, String> {
    // 首先尝试应用数据目录
    if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
        let full_path = app_data_dir.join(relative_path);
        if full_path.exists() {
            return Ok(full_path.to_string_lossy().into_owned());
        }
    }

    // 然后尝试当前工作目录
    if let Ok(current_dir) = std::env::current_dir() {
        let full_path = current_dir.join(relative_path);
        if full_path.exists() {
            return Ok(full_path.to_string_lossy().into_owned());
        }
    }
    // 最后尝试临时目录
    let temp_dir = std::env::temp_dir().join("com.vision-match.app");

    let temp_path = temp_dir.join(relative_path);
    if temp_path.exists() {
        return Ok(temp_path.to_string_lossy().into_owned());
    }

    // 找不到文件，返回错误
    Err(format!("无法找到文件: {}", relative_path))
}

/// 获取应用数据目录中的路径 - 即使文件不存在也返回完整路径
pub fn get_app_data_path(app_handle: &AppHandle, relative_path: &str) -> Result<String, String> {
    // 获取应用数据目录
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {}", e))?;

    // 返回完整路径
    let full_path = app_data_dir.join(relative_path);
    Ok(full_path.to_string_lossy().into_owned())
}
/// 获取资源目录中文件的绝对路径
pub fn get_resource_path(app_handle: &AppHandle, relative_path: &str) -> Result<String, String> {
    let resource_path = relative_path.replace('\\', "/");
    // 方法1：使用Tauri的资源目录API
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let resource_path = resource_dir.join(resource_path);
        if resource_path.exists() {
            return Ok(resource_path.to_string_lossy().into_owned());
        }
    }
    Err(format!("无法找到资源文件: {}", relative_path))
}
