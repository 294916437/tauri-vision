# 资源目录结构

此目录包含应用运行所需的资源文件。请按照以下结构组织文件:

## 目录结构

```
resources/
├── models/               # 存放机器学习模型
│   └── result_model.pth  # 模型文件
└── scripts/              # Python脚本
    └── inference.py     # 推理脚本
```

## 模型文件

请将训练好的 PyTorch 模型文件 `result_model.pth` 放置在 `models` 目录中。

## Python 脚本

创建 `inference.py` 脚本以处理图像分析逻辑。脚本应接收以下参数:

1. 图像路径
2. 模型路径

并返回 JSON 格式的处理结果。例如:

```json
{
  "prediction": "类别名称",
  "confidence": 0.95,
  "class_probabilities": {
    "类别1": 0.95,
    "类别2": 0.03,
    "类别3": 0.02
  }
}
```
