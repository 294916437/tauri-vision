use sha2::{Digest, Sha256};
use std::path::Path;

/// 从文件名中提取扩展名
pub fn get_file_extension(filename: &str) -> Option<&str> {
    Path::new(filename).extension().and_then(|ext| ext.to_str())
}

/// 计算文件数据的SHA256哈希值
pub fn calculate_file_hash(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let hash = hasher.finalize();
    format!("{:x}", hash)
}
