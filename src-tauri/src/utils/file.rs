use sha2::{Digest, Sha256};
use std::path::Path;

/// 从文件名中提取扩展名
pub fn split_filename(filename: &str) -> (String, String) {
    let path = Path::new(filename);

    // 获取文件名部分（不含路径）
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(filename);

    // 获取扩展名（如果有）
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .unwrap_or_else(|| "bin".to_string()); // 如果没有扩展名，默认使用"bin"

    // 获取不带扩展名的文件名
    let stem = path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or(file_name);

    (stem.to_string(), extension)
}

/// 计算文件数据的SHA256哈希值
pub fn calculate_file_hash(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let hash = hasher.finalize();
    format!("{:x}", hash)
}
