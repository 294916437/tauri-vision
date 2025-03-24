use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::{env, fs};
use tauri::{AppHandle, Manager};

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

/// 获取配置文件路径 - 使用 Tauri 内置的 app_config_dir
pub fn get_config_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    // 使用 Tauri 的 app_config_dir 获取配置目录
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法获取应用配置目录: {}", e))?;

    // 确保目录存在
    if let Err(e) = fs::create_dir_all(&config_dir) {
        return Err(format!("无法创建配置目录: {}", e));
    }

    // 返回配置文件的完整路径
    Ok(config_dir.join("settings.json"))
}

// 全局单例配置
static APP_CONFIG: OnceCell<AppConfig> = OnceCell::new();

/// 初始化应用程序配置
pub fn init_config(app_handle: Option<&AppHandle>) -> &'static AppConfig {
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
            if let Some(app_handle) = app_handle {
                match get_config_path(app_handle) {
                    Ok(config_path) => {
                        if config_path.exists() {
                            match fs::read_to_string(&config_path) {
                                Ok(content) => match serde_json::from_str::<AppConfig>(&content) {
                                    Ok(config) => {
                                        println!("从文件加载配置成功: {:?}", config_path);
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
            } else {
                println!("没有提供AppHandle，无法加载配置文件");
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

/// 保存配置到文件
pub fn save_config(app_handle: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let config_path = get_config_path(app_handle)?;

    let json = match serde_json::to_string_pretty(config) {
        Ok(json) => json,
        Err(e) => return Err(format!("序列化配置失败: {}", e)),
    };

    if let Err(e) = fs::write(&config_path, json) {
        return Err(format!("写入配置文件失败: {}", e));
    }

    println!("配置已保存到: {:?}", config_path);
    Ok(())
}
