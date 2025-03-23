use std::env;
use std::path::{Path, PathBuf};

/// 将相对路径转换为绝对路径
pub fn to_absolute_path(path: &str) -> String {
    let normalized_path = path.replace('/', &std::path::MAIN_SEPARATOR.to_string());
    let path_buf = if Path::new(&normalized_path).is_absolute() {
        PathBuf::from(normalized_path)
    } else {
        match env::current_dir() {
            Ok(current_dir) => current_dir.join(normalized_path),
            Err(_) => PathBuf::from(normalized_path),
        }
    };

    match path_buf.to_str() {
        Some(s) => s.to_string(),
        None => path.to_string(),
    }
}
/// 返回一个可以在前端安全访问的URL
pub fn to_safe_frontend_url(path: &str) -> String {
    // 首先获取绝对路径
    let abs_path = to_absolute_path(path);

    // 检查文件是否存在（可选，增加健壮性）
    if !Path::new(&abs_path).exists() {
        // 如果文件不存在，返回一个空字符串或错误标识
        return String::from("");
    }

    // 转换路径分隔符为URL友好格式
    let url_path = abs_path.replace('\\', "/");

    // 从路径中提取相对于项目根目录的部分
    if let Some(index) = url_path.find("src-tauri") {
        let relative_path = &url_path[index + "src-tauri/".len()..];
        format!("asset://{}", relative_path)
    } else {
        // 如果找不到src-tauri，则使用整个路径
        // 警告：这可能在某些情况下不安全
        format!("asset://{}", url_path)
    }
}
