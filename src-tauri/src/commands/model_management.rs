use crate::config::models::MODEL_REGISTRY;
use crate::models::inference_result::{AvailableModels, ModelInfo};
use crate::services::python::PYTHON_SERVICE;
use crate::utils::path_utils::to_absolute_path;
use tauri::command;

#[command]
pub fn get_available_models() -> Result<AvailableModels, String> {
    let registry = MODEL_REGISTRY.lock().map_err(|_| "无法获取模型注册表锁")?;
    let models = registry.get_models();
    let active_model_id = registry
        .get_active_model()
        .map(|m| m.id)
        .unwrap_or_default();

    Ok(AvailableModels {
        models,
        active_model_id,
    })
}

#[command]
pub fn switch_model(model_id: String) -> Result<ModelInfo, String> {
    println!("切换到模型: {}", model_id);

    // 获取模型信息并设置为活跃
    let mut registry = MODEL_REGISTRY.lock().map_err(|_| "无法获取模型注册表锁")?;
    let model = registry.set_active_model(&model_id)?;

    // 获取脚本和模型的绝对路径
    let script_abs_path = to_absolute_path(&model.script_path);
    let model_abs_path = to_absolute_path(&model.path);

    // 切换Python服务中使用的模型
    let mut service_lock = PYTHON_SERVICE.lock().map_err(|_| "无法获取Python服务锁")?;

    if let Some(service) = service_lock.as_mut() {
        // 如果服务已存在，切换模型
        service.switch_model(&script_abs_path, &model_abs_path)?;
    }
    // 注意：如果服务不存在，不需要创建，因为第一次调用process_image时会创建

    println!("模型切换成功，当前活跃模型: {}", model.name);
    Ok(model)
}
