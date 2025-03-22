pub mod commands;
pub mod config;
pub mod db;
pub mod models;
pub mod services;
pub mod utils;

// 大类API
pub use commands::file_management::save_uploaded_image;
pub use commands::image_processing::process_image;
pub use commands::model_management::{get_available_models, switch_model};
pub use commands::save_image_history::save_image_history;
// 普通API
pub use commands::db_api::{
    delete_history, get_history_by_model, get_history_by_status, get_history_count,
    get_user_history,
};
