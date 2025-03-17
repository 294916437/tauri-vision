use log::{error, info};
use mongodb::{error::Error as MongoError, options::ClientOptions, Client, Database};
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::OnceCell;

// 静态客户端实例
static DB_CLIENT: OnceCell<Arc<Client>> = OnceCell::const_new();
static DB_NAME: OnceCell<String> = OnceCell::const_new();

#[derive(Debug, Error)]
pub enum DbError {
    #[error("MongoDB错误: {0}")]
    MongoError(#[from] MongoError),

    #[error("序列化错误: {0}")]
    SerializationError(#[from] mongodb::bson::ser::Error),

    #[error("反序列化错误: {0}")]
    DeserializationError(#[from] mongodb::bson::de::Error),

    #[error("客户端未初始化")]
    UninitializedClient,

    #[error("找不到记录")]
    NotFound,

    #[error("无效的ObjectId: {0}")]
    InvalidObjectId(String),

    #[error("其他错误: {0}")]
    Other(String),
}

/// 初始化MongoDB客户端
pub async fn init_mongodb(connection_string: &str, db_name: &str) -> Result<(), DbError> {
    let options = ClientOptions::parse(connection_string).await?;
    let client = Client::with_options(options)?;

    // 测试连接
    client.list_database_names().await?;

    if DB_CLIENT.get().is_none() {
        DB_CLIENT
            .set(Arc::new(client))
            .map_err(|_| DbError::Other("无法设置数据库客户端".to_string()))?;

        DB_NAME
            .set(db_name.to_string())
            .map_err(|_| DbError::Other("无法设置数据库名称".to_string()))?;

        info!("MongoDB客户端初始化成功，数据库: {}", db_name);
    }

    Ok(())
}

/// 获取数据库客户端
pub fn get_client() -> Result<Arc<Client>, DbError> {
    DB_CLIENT.get().cloned().ok_or(DbError::UninitializedClient)
}

/// 获取数据库名称
pub fn get_db_name() -> Result<&'static str, DbError> {
    DB_NAME
        .get()
        .map(|s| s.as_str())
        .ok_or(DbError::UninitializedClient)
}

/// 获取数据库
pub fn get_database() -> Result<Database, DbError> {
    let client = get_client()?;
    let db_name = get_db_name()?;
    Ok(client.database(db_name))
}
