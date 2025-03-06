use crate::models::inference_result::ModelResult;
use crate::services::python::{PythonService, PYTHON_SERVICE};
use crate::utils::env_utils::{get_model_path, get_python_executable, get_script_path};
use crate::utils::path_utils::to_absolute_path;
use serde_json;
use tauri::command;

#[command]
pub async fn process_image(image_path: String) -> Result<ModelResult, String> {
    println!("处理图像: {}", image_path);
    let image_abs_path = to_absolute_path(&image_path);

    // 获取Python服务的配置
    let python_executable = get_python_executable();
    let script_abs_path = get_script_path();
    let model_abs_path = get_model_path();

    // 获取或初始化Python服务
    let mut service_lock = PYTHON_SERVICE.lock().map_err(|_| "无法获取Python服务锁")?;

    if service_lock.is_none() {
        *service_lock = Some(PythonService::new(
            python_executable,
            script_abs_path,
            model_abs_path,
        ));
    }

    // 使用服务处理图像
    let result = service_lock
        .as_mut()
        .unwrap()
        .process_image(&image_abs_path)?;

    // 解析JSON响应
    match serde_json::from_str(&result) {
        Ok(result) => Ok(result),
        Err(e) => {
            println!("JSON解析失败: {}", e);
            println!("原始输出: {}", result);
            Err(format!("结果解析失败: {}", e))
        }
    }
}
