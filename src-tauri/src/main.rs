// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod core;
use core::api::{process_image, save_uploaded_image};
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![process_image, save_uploaded_image])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
