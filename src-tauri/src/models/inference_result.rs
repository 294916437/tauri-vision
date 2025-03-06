use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub struct InferenceResult {
    pub prediction: String,
    pub confidence: f32,
    pub class_probabilities: HashMap<String, f32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ErrorResult {
    pub error: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum ModelResult {
    Success(InferenceResult),
    Error(ErrorResult),
}
