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
    // 初始化日志

    //初始化常量模型
    config::constants::init_config();

    // 从环境变量获取数据库连接信息
    let mongo_uri = env::var("MONGODB_URI").unwrap_or_else(|_| {
        eprintln!("错误: 环境变量MONGODB_URI未设置");
        panic!("需要设置MONGODB_URI环境变量");
    });

    let db_name = env::var("MONGODB_DATABASE").unwrap_or_else(|_| {
        eprintln!("警告: 环境变量MONGODB_DATABASE未设置，使用默认数据库名");
        "tauri_vision_db".to_string()
    });

    // 初始化MongoDB连接 - 等待连接完成
    let _ = db::db_client::init_mongodb(&mongo_uri, &db_name).await;

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            process_image,
            save_uploaded_image,
            get_available_models,
            switch_model
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
