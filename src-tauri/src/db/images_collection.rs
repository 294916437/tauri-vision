use super::db_client::{get_database, DbError};
use futures::TryStreamExt;
use mongodb::{
    bson::{self, doc, oid::ObjectId, DateTime, Document},
    options::FindOptions,
};
use serde::{Deserialize, Serialize};

//
// 第一部分: 数据模型定义
//

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Image {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    // 必需字段
    pub hash: String,         // 图片的唯一哈希值（必需）
    pub image_name: String,   // 图片的文件名（必需）
    pub created_at: DateTime, // 创建时间（必需）
    // 可选字段
    pub original_name: Option<String>, // 用户上传的原始文件名
    pub storage_path: Option<String>,  // 图片在服务器上的存储路径
    pub image_url: Option<String>,     // 图片URL
    pub file_size: Option<i32>,        // 图片文件大小，单位为字节
    pub format: Option<String>,        // 图片格式，如JPEG、PNG等
    pub tags: Option<Vec<String>>,     // 图片标签，字符串数组
    pub updated_at: Option<DateTime>,  // 更新时间
}

//
// 第二部分: 仓储实现
//

pub struct ImageRepository;

impl ImageRepository {
    const COLLECTION_NAME: &'static str = "images";

    /// 获取图像集合
    fn get_collection() -> Result<mongodb::Collection<Document>, DbError> {
        let db = get_database()?;
        Ok(db.collection(Self::COLLECTION_NAME))
    }

    pub async fn add_image(
        hash: &str,
        image_name: &str,
        original_name: Option<&str>,
        storage_path: Option<&str>,
        image_url: Option<&str>,
        file_size: Option<i32>,
        format: Option<&str>,
        tags: Option<Vec<String>>,
    ) -> Result<ObjectId, DbError> {
        let collection = Self::get_collection()?;

        // 检查是否已存在相同哈希的图像
        let existing = collection.find_one(doc! { "hash": hash }).await?;

        if let Some(doc) = existing {
            // 如果已存在，返回已有ID
            return doc
                .get_object_id("_id")
                .map_err(|_| DbError::Other("无法获取已存在图像的ID".to_string()));
        }

        // 创建新图像记录
        let image = Image {
            id: None,
            hash: hash.to_string(),
            image_name: image_name.to_string(),
            original_name: original_name.map(String::from),
            storage_path: storage_path.map(String::from),
            image_url: image_url.map(String::from),
            file_size,
            format: format.map(String::from),
            tags,
            created_at: bson::DateTime::now(),
            updated_at: None,
        };

        // 将结构转换为BSON Document
        let doc = mongodb::bson::to_document(&image).map_err(DbError::SerializationError)?;

        let result = collection.insert_one(doc).await?;

        result
            .inserted_id
            .as_object_id()
            .ok_or_else(|| DbError::Other("无法获取插入的ID".to_string()))
    }

    /// 根据哈希查找图像
    pub async fn find_by_hash(hash: &str) -> Result<Option<Image>, DbError> {
        let collection = Self::get_collection()?;

        let result = collection.find_one(doc! { "hash": hash }).await?;

        match result {
            Some(doc) => Ok(Some(
                bson::from_document(doc).map_err(DbError::DeserializationError)?,
            )),
            None => Ok(None),
        }
    }

    /// 根据ID查找图像
    pub async fn find_by_id(id: &str) -> Result<Option<Image>, DbError> {
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

    /// 获取最近的图像
    pub async fn find_recent(limit: Option<i64>) -> Result<Vec<Image>, DbError> {
        let collection = Self::get_collection()?;

        let options = FindOptions::builder()
            .sort(doc! { "created_at": -1 })
            .limit(limit)
            .build();

        let cursor = collection.find(doc! {}).with_options(options).await?;
        let docs: Vec<Document> = cursor.try_collect().await?;

        // 手动转换文档到结构体
        let mut results = Vec::with_capacity(docs.len());
        for doc in docs {
            let image: Image = bson::from_document(doc).map_err(DbError::DeserializationError)?;
            results.push(image);
        }

        Ok(results)
    }

    /// 更新图像信息
    pub async fn update_image(
        id: &str,
        image_url: Option<&str>,
        tags: Option<&[String]>,
    ) -> Result<bool, DbError> {
        let collection = Self::get_collection()?;

        let oid = ObjectId::parse_str(id).map_err(|_| DbError::InvalidObjectId(id.to_string()))?;

        let mut update_doc = doc! {
            "updated_at": bson::DateTime::now()
        };

        if let Some(url) = image_url {
            update_doc.insert("image_url", url);
        }

        if let Some(tag_list) = tags {
            update_doc.insert("tags", tag_list);
        }

        let result = collection
            .update_one(doc! { "_id": oid }, doc! { "$set": update_doc })
            .await?;

        Ok(result.modified_count > 0)
    }

    /// 删除图像
    pub async fn delete_by_id(id: &str) -> Result<bool, DbError> {
        let collection = Self::get_collection()?;

        let oid = ObjectId::parse_str(id).map_err(|_| DbError::InvalidObjectId(id.to_string()))?;

        let result = collection.delete_one(doc! { "_id": oid }).await?;

        Ok(result.deleted_count > 0)
    }

    /// 根据哈希删除图像
    pub async fn delete_by_hash(hash: &str) -> Result<bool, DbError> {
        let collection = Self::get_collection()?;

        let result = collection.delete_one(doc! { "hash": hash }).await?;

        Ok(result.deleted_count > 0)
    }

    /// 添加标签到图像
    pub async fn add_tags(id: &str, tags: &[String]) -> Result<bool, DbError> {
        let collection = Self::get_collection()?;

        let oid = ObjectId::parse_str(id).map_err(|_| DbError::InvalidObjectId(id.to_string()))?;

        let result = collection
            .update_one(
                doc! { "_id": oid },
                doc! {
                    "$addToSet": { "tags": { "$each": tags } },
                    "$set": { "updated_at": bson::DateTime::now() }
                },
            )
            .await?;

        Ok(result.modified_count > 0)
    }

    /// 根据标签查找图像
    pub async fn find_by_tags(tags: &[String], limit: Option<i64>) -> Result<Vec<Image>, DbError> {
        let collection = Self::get_collection()?;

        let options = FindOptions::builder()
            .sort(doc! { "created_at": -1 })
            .limit(limit)
            .build();

        let filter = doc! {
            "tags": { "$in": tags }
        };

        let cursor = collection.find(filter).with_options(options).await?;
        let docs: Vec<Document> = cursor.try_collect().await?;

        // 手动转换文档到结构体
        let mut results = Vec::with_capacity(docs.len());
        for doc in docs {
            let image: Image = bson::from_document(doc).map_err(DbError::DeserializationError)?;
            results.push(image);
        }

        Ok(results)
    }
}
