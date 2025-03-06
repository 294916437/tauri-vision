use crate::utils::path_utils::to_absolute_path;
use std::env;

/// 简化的环境变量获取函数
pub fn get_env_var(name: &str, default: &str) -> String {
    match env::var(name) {
        Ok(value) if !value.trim().is_empty() => value,
        _ => default.to_string(),
    }
}

/// 获取Python可执行文件路径
pub fn get_python_executable() -> String {
    let python_exe = get_env_var(
        "PYTHON_EXECUTABLE_PATH",
        "D:/IDEA/anaconda3/envs/py310/python.exe",
    );
    to_absolute_path(&python_exe)
}

/// 获取模型的绝对路径
pub fn get_model_path() -> String {
    let model_path = get_env_var("MODEL_PATH", "resources/model/result_improved.pth");
    to_absolute_path(&model_path)
}

/// 获取Python脚本的绝对路径
pub fn get_script_path() -> String {
    let script_path = get_env_var("PYTHON_SCRIPT_PATH", "resources/python/inference.py");
    to_absolute_path(&script_path)
}
