#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use dotenv::dotenv;
use once_cell::sync::Lazy;
use std::env;
use vision_match::*;
static DB_INIT: Lazy<()> = Lazy::new(|| {
    dotenv().ok();
    println!("已加载环境变量");
});
#[tokio::main]
async fn main() {
    //加载环境变量
    Lazy::force(&DB_INIT);
    //初始化常量模型
    let app_config = init_config();
    println!("已加载应用配置");

    let mongo_uri = app_config.mongodb_uri.clone();

    let db_name = app_config.mongodb_database.clone();

    // 初始化MongoDB连接 - 等待连接完成
    let _ = init_mongodb(&mongo_uri, &db_name).await;

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
