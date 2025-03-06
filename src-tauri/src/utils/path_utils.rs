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
