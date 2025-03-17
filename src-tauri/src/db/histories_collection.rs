use super::db_client::{get_database, DbError};
use futures::TryStreamExt;
use mongodb::{
    bson::{self, doc, oid::ObjectId, to_bson, DateTime, Document},
    options::FindOptions,
};
use serde::{Deserialize, Serialize};

//
// 第一部分: 数据模型定义
//

// 历史记录模型 - 严格按照建表语句定义字段
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageHistory {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    // 必需字段
    pub mac_address: String,       // 必须是字符串，表示用户MAC地址
    pub image_id: ObjectId,        // images集合中的ObjectId引用
    pub model_name: String,        // 必须是字符串，表示使用的模型名称
    pub status: RecognitionStatus, // 必须是预定义的状态值之一
    pub created_at: DateTime,      // 必须是日期时间，表示创建时间
    // 可选字段
    pub confidence: Option<f64>, // 如果提供，必须是浮点数，表示置信度
    pub result: Option<serde_json::Value>, // 如果提供，必须是对象，存储识别结果
    pub error_message: Option<String>, // 如果处理失败，记录错误信息
    pub updated_at: Option<DateTime>, // 更新时间
}

// 识别状态枚举 - 确保与MongoDB枚举值匹配
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum RecognitionStatus {
    Pending,    // 待处理
    Processing, // 处理中
    Success,    // 成功
    Failed,     // 失败
    Error,      // 错误
}

// 实现默认值
impl Default for RecognitionStatus {
    fn default() -> Self {
        RecognitionStatus::Pending
    }
}

//
// 第二部分: 仓储实现
//

/// 图像历史记录操作工具
pub struct ImageHistoryRepository;

impl ImageHistoryRepository {
    const COLLECTION_NAME: &'static str = "histories";

    /// 获取图像历史记录集合
    fn get_collection() -> Result<mongodb::Collection<Document>, DbError> {
        let db = get_database()?;
        Ok(db.collection(Self::COLLECTION_NAME))
    }

    /// 添加新的历史记录 - 移除不在建表语句中的参数
    pub async fn add_history(
        mac_address: &str,
        image_id: ObjectId,
        model_name: &str,
        status: RecognitionStatus,
        result: Option<serde_json::Value>,
        confidence: Option<f64>,
        error_message: Option<&str>,
    ) -> Result<ObjectId, DbError> {
        let collection = Self::get_collection()?;

        let history = ImageHistory {
            id: None,
            mac_address: mac_address.to_string(),
            image_id,
            model_name: model_name.to_string(),
            status,
            confidence,
            result,
            error_message: error_message.map(String::from),
            created_at: bson::DateTime::now(),
            updated_at: None,
        };

        // 将结构转换为BSON Document
        let doc = mongodb::bson::to_document(&history).map_err(DbError::SerializationError)?;

        let result = collection.insert_one(doc).await?;

        result
            .inserted_id
            .as_object_id()
            .ok_or_else(|| DbError::Other("无法获取插入的ID".to_string()))
    }

    /// 根据ID查找历史记录
    pub async fn find_by_id(id: &str) -> Result<Option<ImageHistory>, DbError> {
        let collection = Self::get_collection()?;

        let oid = ObjectId::parse_str(id).map_err(|_| DbError::InvalidObjectId(id.to_string()))?;

        let result = collection.find_one(doc! { "_id": oid }).await?;

        match result {
            Some(doc) => Ok(Some(
                bson::from_document(doc).map_err(DbError::DeserializationError)?,
            )),
            None => Ok(None),
        }
    }

    /// 根据图像ID查找历史记录
    pub async fn find_by_image_id(image_id: &str) -> Result<Vec<ImageHistory>, DbError> {
        let collection = Self::get_collection()?;

        let oid = ObjectId::parse_str(image_id)
            .map_err(|_| DbError::InvalidObjectId(image_id.to_string()))?;

        let filter = doc! { "image_id": oid };
        let options = FindOptions::builder()
            .sort(doc! { "created_at": -1 })
            .build();

        let cursor = collection.find(filter).with_options(options).await?;
        let docs: Vec<Document> = cursor.try_collect().await?;

        // 手动转换文档到结构体
        let mut results = Vec::with_capacity(docs.len());
        for doc in docs {
            let history: ImageHistory =
                bson::from_document(doc).map_err(DbError::DeserializationError)?;
            results.push(history);
        }

        Ok(results)
    }

    /// 查找用户的历史记录
    pub async fn find_by_mac_address(
        mac_address: &str,
        limit: Option<i64>,
        skip: Option<u64>,
    ) -> Result<Vec<ImageHistory>, DbError> {
        let collection = Self::get_collection()?;

        let options = FindOptions::builder()
            .sort(doc! { "created_at": -1 })
            .limit(limit)
            .skip(skip)
            .build();

        let filter = doc! { "mac_address": mac_address };

        let cursor = collection.find(filter).with_options(options).await?;
        let docs: Vec<Document> = cursor.try_collect().await?;

        // 手动转换文档到结构体
        let mut results = Vec::with_capacity(docs.len());
        for doc in docs {
            let history: ImageHistory =
                bson::from_document(doc).map_err(DbError::DeserializationError)?;
            results.push(history);
        }

        Ok(results)
    }

    /// 按状态查找用户的历史记录
    pub async fn find_by_status_and_mac(
        mac_address: &str,
        status: RecognitionStatus,
        limit: Option<i64>,
    ) -> Result<Vec<ImageHistory>, DbError> {
        let collection = Self::get_collection()?;

        let status_bson = to_bson(&status).map_err(DbError::SerializationError)?;

        let filter = doc! {
            "mac_address": mac_address,
            "status": status_bson
        };

        let options = FindOptions::builder()
            .sort(doc! { "created_at": -1 })
            .limit(limit)
            .build();

        let cursor = collection.find(filter).with_options(options).await?;
        let docs: Vec<Document> = cursor.try_collect().await?;

        // 手动转换文档到结构体
        let mut results = Vec::with_capacity(docs.len());
        for doc in docs {
            let history: ImageHistory =
                bson::from_document(doc).map_err(DbError::DeserializationError)?;
            results.push(history);
        }

        Ok(results)
    }

    /// 按模型名称和MAC地址查找历史记录
    pub async fn find_by_model_and_mac(
        mac_address: &str,
        model_name: &str,
        limit: Option<i64>,
    ) -> Result<Vec<ImageHistory>, DbError> {
        let collection = Self::get_collection()?;

        let filter = doc! {
            "mac_address": mac_address,
            "model_name": model_name
        };

        let options = FindOptions::builder()
            .sort(doc! { "created_at": -1 })
            .limit(limit)
            .build();

        let cursor = collection.find(filter).with_options(options).await?;
        let docs: Vec<Document> = cursor.try_collect().await?;

        // 手动转换文档到结构体
        let mut results = Vec::with_capacity(docs.len());
        for doc in docs {
            let history: ImageHistory =
                bson::from_document(doc).map_err(DbError::DeserializationError)?;
            results.push(history);
        }

        Ok(results)
    }

    /// 更新历史记录的状态和结果 - 移除不在建表语句中的参数
    pub async fn update_status(
        id: &str,
        status: RecognitionStatus,
        result: Option<serde_json::Value>,
        confidence: Option<f64>,
        error_message: Option<&str>,
    ) -> Result<bool, DbError> {
        let collection = Self::get_collection()?;

        let oid = ObjectId::parse_str(id).map_err(|_| DbError::InvalidObjectId(id.to_string()))?;

        let mut update_doc = doc! {
            "status": to_bson(&status).map_err(DbError::SerializationError)?,
            "updated_at": bson::DateTime::now()
        };

        if let Some(res) = result {
            update_doc.insert(
                "result",
                to_bson(&res).map_err(DbError::SerializationError)?,
            );
        }

        if let Some(conf) = confidence {
            update_doc.insert("confidence", conf);
        }

        if let Some(err) = error_message {
            update_doc.insert("error_message", err);
        }

        let result = collection
            .update_one(doc! { "_id": oid }, doc! { "$set": update_doc })
            .await?;

        Ok(result.modified_count > 0)
    }

    /// 删除历史记录
    pub async fn delete_by_id(id: &str) -> Result<bool, DbError> {
        let collection = Self::get_collection()?;

        let oid = ObjectId::parse_str(id).map_err(|_| DbError::InvalidObjectId(id.to_string()))?;

        let result = collection.delete_one(doc! { "_id": oid }).await?;

        Ok(result.deleted_count > 0)
    }

    /// 删除用户的所有历史记录
    pub async fn delete_by_mac_address(mac_address: &str) -> Result<u64, DbError> {
        let collection = Self::get_collection()?;

        let result = collection
            .delete_many(doc! { "mac_address": mac_address })
            .await?;

        Ok(result.deleted_count)
    }

    /// 统计用户的历史记录数量
    pub async fn count_by_mac_address(mac_address: &str) -> Result<u64, DbError> {
        let collection = Self::get_collection()?;

        let count = collection
            .count_documents(doc! { "mac_address": mac_address })
            .await?;

        Ok(count)
    }

    /// 按模型名称统计使用次数
    pub async fn count_by_model(model_name: &str) -> Result<u64, DbError> {
        let collection = Self::get_collection()?;

        let count = collection
            .count_documents(doc! { "model_name": model_name })
            .await?;

        Ok(count)
    }
}
