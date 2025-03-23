use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::env;
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub upload_dir: String,
    pub python_executable: String,
    // 数据库配置
    pub mongodb_uri: String,
    pub mongodb_database: String,
}
impl Default for AppConfig {
    fn default() -> Self {
        Self {
            upload_dir: String::from("uploads"),
            python_executable: String::from("python"),
            // 默认MongoDB连接信息
            mongodb_uri: String::from("localhost"),
            mongodb_database: String::from("mongodb"),
        }
    }
}

// 全局单例配置
static APP_CONFIG: OnceCell<AppConfig> = OnceCell::new();

/// 初始化应用程序配置
pub fn init_config() -> &'static AppConfig {
    APP_CONFIG.get_or_init(|| {
        let mut config = AppConfig::default();
        if let Ok(value) = env::var("PYTHON_EXECUTABLE") {
            config.python_executable = value;
        }
        if let Ok(value) = env::var("MONGODB_URI") {
            config.mongodb_uri = value;
        }
        if let Ok(value) = env::var("MONGODB_DATABASE") {
            config.mongodb_database = value;
        }
        config
    })
}

/// 获取应用程序配置
pub fn get_config() -> &'static AppConfig {
    APP_CONFIG.get().expect("应用配置尚未初始化")
}
