use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

pub struct PythonService {
    process: Option<Child>,
    last_used: Instant,
    executable_path: String,
    script_path: String,
    model_path: String,
}

impl PythonService {
    pub fn new(executable_path: String, script_path: String, model_path: String) -> Self {
        Self {
            process: None,
            last_used: Instant::now(),
            executable_path,
            script_path,
            model_path,
        }
    }

    pub fn ensure_running(&mut self) -> Result<(), String> {
        if self.process.is_none() || self.is_process_dead() {
            self.start_process()?;
        }
        self.last_used = Instant::now();
        Ok(())
    }

    fn is_process_dead(&mut self) -> bool {
        if let Some(ref mut process) = self.process {
            match process.try_wait() {
                Ok(Some(_)) => true,
                Ok(None) => false,
                Err(_) => true,
            }
        } else {
            true
        }
    }

    fn start_process(&mut self) -> Result<(), String> {
        println!("启动Python服务...");
        let process = Command::new(&self.executable_path)
            .arg(&self.script_path)
            .arg("--server") // 添加服务模式标志
            .arg(&self.model_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("无法启动Python服务: {}", e))?;

        println!("Python服务已启动");
        self.process = Some(process);

        // 简单等待服务准备就绪
        thread::sleep(Duration::from_secs(2));
        Ok(())
    }

    pub fn process_image(&mut self, image_path: &str) -> Result<String, String> {
        self.ensure_running()?;

        let process = self.process.as_mut().unwrap();

        // 写入命令到Python进程
        let mut stdin = process.stdin.take().ok_or("无法获取stdin")?;
        let command = format!("process_image:{}\n", image_path);
        stdin
            .write_all(command.as_bytes())
            .map_err(|e| format!("写入失败: {}", e))?;
        process.stdin = Some(stdin);

        // 读取输出
        let mut reader = BufReader::new(process.stdout.take().ok_or("无法获取stdout")?);
        let mut result = String::new();
        reader
            .read_line(&mut result)
            .map_err(|e| format!("读取失败: {}", e))?;
        process.stdout = Some(reader.into_inner());

        Ok(result.trim().to_string())
    }

    pub fn shutdown(&mut self) {
        if let Some(ref mut process) = self.process {
            // 发送退出命令
            if let Some(mut stdin) = process.stdin.take() {
                let _ = stdin.write_all(b"exit\n");
            }

            // 给进程一些时间来清理
            thread::sleep(Duration::from_millis(500));

            // 强制终止进程
            let _ = process.kill();
            let _ = process.wait();
            println!("Python服务已关闭");
        }
    }
}

impl Drop for PythonService {
    fn drop(&mut self) {
        self.shutdown();
    }
}

// 全局单例服务
lazy_static::lazy_static! {
    pub static ref PYTHON_SERVICE: Arc<Mutex<Option<PythonService>>> = Arc::new(Mutex::new(None));
}

// 启动自动清理线程
pub fn start_cleanup_thread() {
    let service = PYTHON_SERVICE.clone();
    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_secs(300)); // 5分钟检查一次

            let mut service_lock = service.lock().unwrap();
            if let Some(ref mut python_service) = *service_lock {
                // 如果30分钟未使用，关闭服务
                if python_service.last_used.elapsed() > Duration::from_secs(1800) {
                    println!("Python服务长时间未使用，关闭中...");
                    python_service.shutdown();
                    *service_lock = None;
                }
            }
        }
    });
}
