use crate::models::inference_result::ModelResult;
use crate::services::model_manager::MODEL_REGISTRY;
use crate::services::python::{PythonService, PYTHON_SERVICE};
use crate::utils::path_utils::to_absolute_path;
use serde_json;
use std::path::Path;
use tauri::command;

#[command]
pub async fn process_image(image_path: String) -> Result<ModelResult, String> {
    println!("处理图像: {}", image_path);
    let image_abs_path = to_absolute_path(&image_path);

    // 确保图像文件存在
    if !Path::new(&image_abs_path).exists() {
        return Err(format!("图像文件不存在: {}", image_abs_path));
    }

    // 获取当前活跃模型
    let registry = MODEL_REGISTRY.lock().map_err(|_| "无法获取模型注册表锁")?;
    let active_model = registry.get_active_model().ok_or("没有活跃的模型")?;

    // 获取模型脚本和路径
    let script_abs_path = to_absolute_path(&active_model.script_path);
    let model_abs_path = to_absolute_path(&active_model.path);

    // 获取或初始化Python服务
    let mut service_lock = PYTHON_SERVICE.lock().map_err(|_| "无法获取Python服务锁")?;

    if service_lock.is_none() {
        // 获取Python可执行文件路径
        let python_executable = std::env::var("PYTHON_EXECUTABLE").unwrap_or_else(|_| {
            if cfg!(target_os = "windows") {
                "python".to_string()
            } else {
                "python3".to_string()
            }
        });

        println!("初始化Python服务，使用模型: {}", active_model.name);

        // 创建新的Python服务
        *service_lock = Some(PythonService::new(
            python_executable,
            script_abs_path,
            model_abs_path,
        ));
    } else {
        // 确保使用的是当前活跃模型
        service_lock
            .as_mut()
            .unwrap()
            .switch_model(&script_abs_path, &model_abs_path)?;
    }

    // 处理图像
    let model_type = active_model.model_type.clone();
    let result = service_lock
        .as_mut()
        .unwrap()
        .process_image(&image_abs_path)?;

    // 解析JSON响应
    match serde_json::from_str::<ModelResult>(&result) {
        Ok(mut model_result) => {
            // 添加模型类型信息
            model_result.model_type = Some(model_type);
            Ok(model_result)
        }
        Err(e) => {
            println!("JSON解析失败: {}", e);
            println!("原始输出: {}", result);
            Err(format!("结果解析失败: {}", e))
        }
    }
}
