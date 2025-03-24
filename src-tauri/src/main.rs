#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use once_cell::sync::Lazy;
use vision_match::config::constants;
use vision_match::*;

// 环境变量和配置初始化
static CONFIG_INIT: Lazy<&'static constants::AppConfig> = Lazy::new(|| {
    // 开发环境下加载 .env 文件
    #[cfg(debug_assertions)]
    {
        dotenv::dotenv().ok();
        println!("开发模式：已加载环境变量");
    }

    // 初始化并返回应用配置
    constants::init_config()
});

#[tokio::main]
async fn main() {
    // 强制初始化配置
    let config = *CONFIG_INIT;

    println!("应用配置:");
    println!("- Python: {}", config.python_executable);
    println!("- MongoDB: {}", config.mongodb_uri);
    println!("- 数据库: {}", config.mongodb_database);

    // 初始化MongoDB连接
    match init_mongodb(&config.mongodb_uri, &config.mongodb_database).await {
        Ok(_) => println!("MongoDB连接成功"),
        Err(e) => eprintln!("MongoDB连接失败: {}", e),
    }

    // 启动Tauri应用
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            process_image,
            save_uploaded_image,
            save_image_history,
            get_available_models,
            switch_model,
            delete_history,
            get_history_by_model,
            get_history_by_status,
            get_history_count,
            get_user_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
