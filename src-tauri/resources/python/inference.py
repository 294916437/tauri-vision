import sys
import torch
import torchvision.transforms as transforms
from PIL import Image
import json
import torchvision.models as models

def load_model(model_path):
    # 加载模型架构 - 与训练时保持一致
    model = models.resnet34(weights=None)
    num_ftrs = model.fc.in_features
    model.fc = torch.nn.Sequential(
        torch.nn.Dropout(0.4),
        torch.nn.Linear(num_ftrs, 256),
        torch.nn.ReLU(),
        torch.nn.Dropout(0.2),
        torch.nn.Linear(256, 10)  # CIFAR-10分类
    )
    
    # 加载预训练权重
    model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    model.eval()
    return model

def preprocess_image(image_path):
    # 图像预处理 - 与训练时保持一致
    transform = transforms.Compose([
        transforms.Resize((32, 32)),
        transforms.ToTensor(),
        transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2470, 0.2435, 0.2616))
    ])
    
    img = Image.open(image_path).convert('RGB')
    img_tensor = transform(img).unsqueeze(0)
    return img_tensor

def infer(model, img_tensor):
    # 执行推理
    with torch.no_grad():
        output = model(img_tensor)
        _, predicted = torch.max(output, 1)
        probabilities = torch.nn.functional.softmax(output, dim=1)[0]
    
    return predicted.item(), probabilities.tolist()

def main():
    if len(sys.argv) != 3:
        print(json.dumps({"error": "参数错误，需要图片路径和模型路径"}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    model_path = sys.argv[2]
    
    classes = ('plane', 'car', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck')
    
    try:
        # 加载模型
        model = load_model(model_path)
        
        # 处理图像
        img_tensor = preprocess_image(image_path)
        
        # 执行推理
        class_idx, probabilities = infer(model, img_tensor)
        
        # 构建结果
        result = {
            "prediction": classes[class_idx],
            "confidence": probabilities[class_idx],
            "class_probabilities": {
                classes[i]: probabilities[i] for i in range(len(classes))
            }
        }
        
        # 输出JSON结果
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
