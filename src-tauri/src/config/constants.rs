use std::sync::OnceLock;

/// 应用程序配置常量
pub struct AppConfig {
    /// 上传目录相对路径
    pub upload_dir: String,

    /// Python执行路径
    pub python_executable: String,

    /// 日志级别
    pub log_level: String,

    /// 是否为开发模式
    pub dev_mode: bool,
}

// 全局单例配置
static APP_CONFIG: OnceLock<AppConfig> = OnceLock::new();

/// 初始化应用程序配置
/// 只会执行一次，后续调用会返回已初始化的配置
pub fn init_config() -> &'static AppConfig {
    APP_CONFIG.get_or_init(|| {
        // 使用简单的配置，仅适用于开发阶段
        let dev_mode = true;

        AppConfig {
            upload_dir: String::from("uploads"),
            python_executable: String::from("D:/IDEA/anaconda3/envs/py310/python.exe"),
            log_level: String::from("debug"), // 开发阶段使用debug日志级别
            dev_mode,
        }
    })
}

/// 获取应用程序配置
pub fn get_config() -> &'static AppConfig {
    APP_CONFIG.get().expect("应用配置尚未初始化")
}
