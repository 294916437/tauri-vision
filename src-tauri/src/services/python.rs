use lazy_static::lazy_static;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

lazy_static! {
    pub static ref PYTHON_SERVICE: Mutex<Option<PythonService>> = Mutex::new(None);
}

pub struct PythonService {
    child: Child,
    python_executable: String,
    current_script: String,
    current_model: String,
}

impl PythonService {
    pub fn new(python_executable: String, script_path: String, model_path: String) -> Self {
        let mut command = Command::new(&python_executable);
        command
            .arg(&script_path)
            .arg("--server")
            .arg(&model_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        println!("启动Python进程: {:?}", command);

        let mut child = command.spawn().expect("无法启动Python进程");

        // 使用take()代替expect()，这样不会部分移动child
        if let Some(stderr) = child.stderr.take() {
            std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        println!("Python stderr: {}", line);
                    }
                }
            });
        }

        let service = PythonService {
            child,
            python_executable,
            current_script: script_path,
            current_model: model_path,
        };

        // 等待服务启动
        std::thread::sleep(Duration::from_secs(1));

        service
    }

    pub fn process_image(&mut self, image_path: &str) -> Result<String, String> {
        let start = Instant::now();

        let stdin = self.child.stdin.as_mut().ok_or("无法获取子进程stdin")?;
        let command = format!("process_image:{}\n", image_path);
        stdin
            .write_all(command.as_bytes())
            .map_err(|e| e.to_string())?;
        stdin.flush().map_err(|e| e.to_string())?;

        // 读取输出
        let stdout = self.child.stdout.as_mut().ok_or("无法获取子进程stdout")?;
        let mut reader = BufReader::new(stdout);
        let mut output = String::new();
        reader.read_line(&mut output).map_err(|e| e.to_string())?;

        let duration = start.elapsed();
        println!("图像处理耗时: {:?}", duration);

        Ok(output.trim().to_string())
    }

    // 修复switch_model方法中的相同问题
    pub fn switch_model(&mut self, script_path: &str, model_path: &str) -> Result<(), String> {
        // 如果脚本和模型都没变，无需重启
        if self.current_script == script_path && self.current_model == model_path {
            return Ok(());
        }

        println!("切换模型: 脚本={}, 模型={}", script_path, model_path);

        // 终止当前进程
        if let Err(e) = self.child.kill() {
            println!("终止Python进程时出错: {}", e);
        }

        // 启动新进程
        let mut command = Command::new(&self.python_executable);
        command
            .arg(script_path)
            .arg("--server")
            .arg(model_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        println!("重启Python进程: {:?}", command);

        let mut child = command.spawn().expect("无法启动Python进程");

        // 使用take()代替expect()
        if let Some(stderr) = child.stderr.take() {
            std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        println!("Python stderr: {}", line);
                    }
                }
            });
        }

        // 更新当前服务状态
        self.child = child;
        self.current_script = script_path.to_string();
        self.current_model = model_path.to_string();

        // 等待服务启动
        std::thread::sleep(Duration::from_secs(1));

        Ok(())
    }
}

impl Drop for PythonService {
    fn drop(&mut self) {
        // 终止Python进程
        if let Err(e) = self.child.kill() {
            println!("终止Python进程时出错: {}", e);
        }
    }
}
