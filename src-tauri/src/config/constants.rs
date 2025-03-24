use dirs;
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::{env, fs};

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

/// 获取配置文件路径 - 使用 dirs crate
pub fn get_config_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    // 使用 dirs crate 获取配置目录
    let config_dir = dirs::config_dir()
        .ok_or_else(|| "无法获取系统配置目录".to_string())?
        .join("com.vision-match.app");

    // 确保目录存在
    fs::create_dir_all(&config_dir)?;

    // 返回配置文件的完整路径
    Ok(config_dir.join("settings.json"))
}

// 全局单例配置
static APP_CONFIG: OnceCell<AppConfig> = OnceCell::new();

/// 初始化应用程序配置
pub fn init_config() -> &'static AppConfig {
    APP_CONFIG.get_or_init(|| {
        // 开发环境使用环境变量
        #[cfg(debug_assertions)]
        {
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
            return config;
        }

        // 生产环境从配置文件加载
        #[cfg(not(debug_assertions))]
        {
            match get_config_path() {
                Ok(config_path) => {
                    if config_path.exists() {
                        match fs::read_to_string(&config_path) {
                            Ok(content) => match serde_json::from_str::<AppConfig>(&content) {
                                Ok(config) => {
                                    println!("从文件加载配置成功");
                                    return config;
                                }
                                Err(e) => {
                                    println!("解析配置文件失败: {}", e);
                                }
                            },
                            Err(e) => {
                                println!("读取配置文件失败: {}", e);
                            }
                        }
                    } else {
                        println!("配置文件不存在，使用默认配置");
                    }
                }
                Err(e) => {
                    println!("获取配置路径失败: {}", e);
                }
            }

            // 如果无法从文件加载，使用默认配置
            AppConfig::default()
        }
    })
}

/// 获取应用程序配置
pub fn get_config() -> &'static AppConfig {
    APP_CONFIG.get().expect("应用配置尚未初始化")
}

/// 保存配置到文件 (仅在必要时使用)
pub fn save_config(config: &AppConfig) -> Result<(), Box<dyn std::error::Error>> {
    let config_path = get_config_path()?;
    let json = serde_json::to_string_pretty(config)?;
    fs::write(&config_path, json)?;
    println!("配置已保存到: {:?}", config_path);
    Ok(())
}
