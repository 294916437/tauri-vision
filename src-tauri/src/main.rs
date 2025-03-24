#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use once_cell::sync::Lazy;
use vision_match::config::constants;
use vision_match::*;

// 环境变量初始化 - 仅处理环境变量，不加载配置
static ENV_INIT: Lazy<()> = Lazy::new(|| {
    // 开发环境下加载 .env 文件
    #[cfg(debug_assertions)]
    {
        dotenv::dotenv().ok();
        println!("开发模式：已加载环境变量");
    }
});

#[tokio::main]
async fn main() {
    // 确保环境变量已初始化
    let _ = *ENV_INIT;

    // 启动Tauri应用
    tauri::Builder::default()
        .setup(|app| {
            // 获取应用句柄，并在这里初始化配置
            let app_handle = app.handle();

            // 初始化配置
            let config = constants::init_config(Some(&app_handle));

            // 初始化MongoDB连接
            let mongodb_uri = config.mongodb_uri.clone();
            let mongodb_db = config.mongodb_database.clone();

            // 使用tokio spawn进行异步初始化
            tokio::spawn(async move {
                match init_mongodb(&mongodb_uri, &mongodb_db).await {
                    Ok(_) => println!("MongoDB连接成功"),
                    Err(e) => eprintln!("MongoDB连接失败: {}", e),
                }
            });

            Ok(())
        })
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
