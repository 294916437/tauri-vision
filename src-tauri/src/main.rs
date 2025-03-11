#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod config;
mod models;
mod services;
mod utils;
use commands::file_management::save_uploaded_image;
use commands::image_processing::process_image;
use commands::model_management::{get_available_models, switch_model};
fn main() {
    //初始化常量模型
    config::constants::init_config();
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
