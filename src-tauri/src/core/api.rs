use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{command, AppHandle, Manager};

#[derive(Serialize, Deserialize, Debug)]
pub struct InferenceResult {
    prediction: String,
    confidence: f32,
    class_probabilities: HashMap<String, f32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ErrorResult {
    error: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum ModelResult {
    Success(InferenceResult),
    Error(ErrorResult),
}

// 简化的环境变量获取函数
fn get_env_var(name: &str, default: &str) -> String {
    match env::var(name) {
        Ok(value) if !value.trim().is_empty() => value,
        _ => default.to_string(),
    }
}

// 获取Python可执行文件路径
fn get_python_executable() -> String {
    let python_exe = get_env_var(
        "PYTHON_EXECUTABLE_PATH",
        "D:/IDEA/anaconda3/envs/py310/python.exe",
    );
    to_absolute_path(&python_exe)
}

// 将相对路径转换为绝对路径，并确保使用系统标准路径分隔符
fn to_absolute_path(path: &str) -> String {
    // 规范化路径分隔符，将正斜杠替换为系统标准分隔符
    let normalized_path = path.replace('/', &std::path::MAIN_SEPARATOR.to_string());

    // 判断是否是绝对路径
    let path_buf = if Path::new(&normalized_path).is_absolute() {
        PathBuf::from(normalized_path)
    } else {
        match env::current_dir() {
            Ok(current_dir) => current_dir.join(normalized_path),
            Err(_) => PathBuf::from(normalized_path),
        }
    };

    // 转换为字符串，确保使用系统标准分隔符
    match path_buf.to_str() {
        Some(s) => s.to_string(),
        None => path.to_string(), // 如果无法转换，返回原始路径
    }
}

// 获取模型的绝对路径
fn get_model_path() -> String {
    let model_path = get_env_var("MODEL_PATH", "resources/model/result_improved.pth");
    to_absolute_path(&model_path)
}

// 获取Python脚本的绝对路径
fn get_script_path() -> String {
    let script_path = get_env_var("PYTHON_SCRIPT_PATH", "resources/python/inference.py");
    to_absolute_path(&script_path)
}

// 获取上传目录
fn get_upload_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let upload_dir_rel = get_env_var("UPLOAD_DIR", "uploads");

    // 获取可能的基础目录
    let base_dirs = [
        env::current_dir().unwrap_or_else(|_| PathBuf::from(".")),
        app_handle
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from(".")),
        app_handle
            .path()
            .resource_dir()
            .unwrap_or_else(|_| PathBuf::from(".")),
    ];

    // 使用第一个存在的目录或创建一个
    for base_dir in &base_dirs {
        let dir = base_dir.join(&upload_dir_rel);
        if dir.exists() || fs::create_dir_all(&dir).is_ok() {
            return Ok(dir);
        }
    }

    // 如果都失败了，返回当前目录下的uploads
    Ok(PathBuf::from(&upload_dir_rel))
}

#[command]
pub async fn process_image(image_path: String) -> Result<ModelResult, String> {
    println!("开始处理图像: {}", image_path);

    // 确保图像路径是绝对路径，并使用系统标准分隔符
    let image_abs_path = to_absolute_path(&image_path);

    // 获取配置的绝对路径
    //todo: python_executable环境变量读取错误
    let python_executable = get_python_executable();
    let script_abs_path = get_script_path();
    let model_abs_path = get_model_path();

    // 执行Python脚本，传递绝对路径参数
    let output = Command::new(&python_executable)
        .arg(&script_abs_path)
        .arg(&image_abs_path)
        .arg(&model_abs_path)
        .output()
        .map_err(|e| format!("执行Python脚本失败: {}", e))?;

    // 解析输出
    let stdout = String::from_utf8(output.stdout).map_err(|e| format!("无法解析输出: {}", e))?;

    // 如果存在错误输出，记录它
    if !output.stderr.is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        println!("Python脚本警告/错误: {}", stderr);
    }

    // JSON解析
    match serde_json::from_str(&stdout) {
        Ok(result) => Ok(result),
        Err(e) => {
            println!("JSON解析失败: {}", e);
            println!("原始输出: {}", stdout);
            Err(format!("结果解析失败: {}", e))
        }
    }
}

#[command]
pub async fn save_uploaded_image(
    app_handle: AppHandle,
    file_data: Vec<u8>,
    file_name: String,
) -> Result<String, String> {
    // 获取上传目录
    let upload_dir = get_upload_dir(&app_handle)?;

    // 保存文件
    let file_path = upload_dir.join(&file_name);
    fs::write(&file_path, file_data).map_err(|e| e.to_string())?;

    // 返回绝对路径
    Ok(file_path.to_str().unwrap_or(&file_name).to_string())
}
