use log::{error, info, warn};
use mac_address::get_mac_address;

/// 获取主机MAC地址
///
/// 尝试获取主要网络接口的MAC地址。如果失败，返回后备值。
///
/// # 返回
/// - 成功时返回格式化的MAC地址字符串（例如"00:1A:2B:3C:4D:5E"）
/// - 失败时返回预设的标识符
pub fn get_main_mac_address() -> String {
    match get_mac_address() {
        Ok(Some(mac)) => {
            let mac_string = mac.to_string();
            info!("获取到MAC地址: {}", mac_string);
            mac_string
        }
        Ok(None) => {
            warn!("无法获取MAC地址，使用备用标识符");
            get_fallback_identifier()
        }
        Err(e) => {
            error!("获取MAC地址错误: {:?}", e);
            get_fallback_identifier()
        }
    }
}

/// 获取扩展的MAC地址信息
///
/// 尝试获取并返回更详细的MAC地址信息，包括接口名称等
///
/// # 返回
/// - 包含MAC地址和接口名称的元组
pub fn get_mac_address_with_interface() -> (String, String) {
    // 在某些平台上，我们可以获取更多网络接口信息
    // 注: mac_address库本身并不提供接口名称，这里只是示范用法

    let mac = get_main_mac_address();
    let interface_name = "default"; // 在实际代码中，可能需要使用其他库获取接口名称

    (mac, interface_name.to_string())
}

/// 获取备用的标识符
///
/// 当无法获取真实MAC地址时，生成一个持久化的标识符
fn get_fallback_identifier() -> String {
    // 尝试基于机器名和其他因素创建一个相对稳定的标识符

    // 1. 尝试获取主机名
    if let Ok(hostname) = std::env::var("HOSTNAME").or_else(|_| std::env::var("COMPUTERNAME")) {
        return format!(
            "host-{}",
            hostname
                .chars()
                .filter(|c| c.is_alphanumeric())
                .collect::<String>()
        );
    }

    // 2. 尝试使用UUID生成一个标识符并保存到本地文件
    // 在实际应用中，您可能希望将这个UUID保存到某个位置以确保持久性

    // 3. 最终后备为一个固定值
    "unknown-device".to_string()
}

/// 获取非默认网络接口的MAC地址
pub fn get_all_mac_addresses() -> Vec<String> {
    // 注：mac_address crate 实际上并不直接支持获取所有接口
    // 这个函数在实际应用中可能需要使用其他库如network-interface

    // 这里只是简单返回主MAC地址
    vec![get_main_mac_address()]
}
