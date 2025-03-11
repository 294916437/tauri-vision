use crate::models::inference_result::ModelInfo;
use lazy_static::lazy_static;
use std::collections::HashMap;
use std::sync::Mutex;
use uuid::Uuid;

lazy_static! {
    pub static ref MODEL_REGISTRY: Mutex<ModelRegistry> = Mutex::new(ModelRegistry::new());
}

pub struct ModelRegistry {
    models: HashMap<String, ModelInfo>,
    active_model_id: String,
}

impl ModelRegistry {
    pub fn new() -> Self {
        let mut registry = ModelRegistry {
            models: HashMap::new(),
            active_model_id: String::new(),
        };

        // 初始化默认模型
        registry.init_default_models();

        registry
    }

    fn init_default_models(&mut self) {
        // 添加 CIFAR-10 模型
        let cifar_id = Uuid::new_v4().to_string();
        let cifar_model = ModelInfo {
            id: cifar_id.clone(),
            name: "CIFAR-10 识别模型".to_string(),
            description: "用于识别10种常见物体的模型，包括飞机、汽车、鸟类等".to_string(),
            path: "resources/models/cifar10_model.pth".to_string(),
            model_type: "ResNet34".to_string(),
            num_classes: 10,
            script_path: "resources/scripts/cifar10_val.py".to_string(),
            is_active: true,
        };
        self.models.insert(cifar_id.clone(), cifar_model);

        // 添加中医药模型
        let medicine_id = Uuid::new_v4().to_string();
        let medicine_model = ModelInfo {
            id: medicine_id.clone(),
            name: "中医药材识别模型".to_string(),
            description: "用于识别中医药材的专用模型，包含上百种药材".to_string(),
            path: "resources/models/medicine_model.pth".to_string(),
            model_type: "MobileNetV3-Small".to_string(),
            num_classes: 163,
            script_path: "resources/scripts/medicine_val.py".to_string(),
            is_active: false,
        };
        self.models.insert(medicine_id.clone(), medicine_model);

        // 设置默认活跃模型
        self.active_model_id = medicine_id;
    }

    pub fn get_models(&self) -> Vec<ModelInfo> {
        self.models.values().cloned().collect()
    }

    pub fn get_active_model(&self) -> Option<ModelInfo> {
        self.models.get(&self.active_model_id).cloned()
    }

    pub fn set_active_model(&mut self, model_id: &str) -> Result<ModelInfo, String> {
        if !self.models.contains_key(model_id) {
            return Err(format!("模型ID不存在: {}", model_id));
        }

        // 重置所有模型状态
        for model in self.models.values_mut() {
            model.is_active = false;
        }

        // 激活选定模型
        let model = self.models.get_mut(model_id).unwrap();
        model.is_active = true;
        self.active_model_id = model_id.to_string();

        Ok(model.clone())
    }

    pub fn add_model(&mut self, mut model: ModelInfo) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();
        model.id = id.clone();
        self.models.insert(id.clone(), model);
        Ok(id)
    }

    pub fn remove_model(&mut self, model_id: &str) -> Result<(), String> {
        if !self.models.contains_key(model_id) {
            return Err(format!("模型ID不存在: {}", model_id));
        }

        // 如果删除的是当前活跃模型，则切换到另一个模型
        if model_id == self.active_model_id {
            // 找到一个不同的模型
            if let Some(another_id) = self.models.keys().find(|&id| id != model_id) {
                self.active_model_id = another_id.clone();
                let model = self.models.get_mut(&self.active_model_id).unwrap();
                model.is_active = true;
            } else {
                // 如果没有其他模型了，清空活跃模型ID
                self.active_model_id = String::new();
            }
        }

        self.models.remove(model_id);
        Ok(())
    }
}
