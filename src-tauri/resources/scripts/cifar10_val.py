import sys
import torch
import torchvision.transforms as transforms
from PIL import Image
import json
import torchvision.models as models
import argparse

# 全局变量存储模型
model = None
transform = None
class_names = ['airplane', 'automobile', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck']

def load_model(model_path):
    global model
    if model is None:
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
        
        # 初始化图像变换
        global transform
        transform = transforms.Compose([
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
            transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2470, 0.2435, 0.2616))
        ])
        
        print("模型加载完成", file=sys.stderr)
    return model

def preprocess_image(image_path):
    image = Image.open(image_path).convert('RGB')
    return transform(image).unsqueeze(0)  # 添加batch维度

def predict(image_tensor):
    with torch.no_grad():
        outputs = model(image_tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]
        
        # 获取最高概率的类别
        _, predicted_idx = torch.max(probabilities, 0)
        predicted_class = class_names[predicted_idx.item()]
        confidence = probabilities[predicted_idx].item()
        
        # 构建所有类别的概率字典
        class_probs = {class_names[i]: prob.item() for i, prob in enumerate(probabilities)}
        
    return {
        "prediction": predicted_class,
        "confidence": confidence,
        "class_probabilities": class_probs
    }

def run_server(model_path):
    """运行服务模式，持续接收命令"""
    print("Python推理服务已启动", file=sys.stderr)
    load_model(model_path)
    
    try:
        while True:
            line = sys.stdin.readline().strip()
            if not line or line == "exit":
                break
                
            if line.startswith("process_image:"):
                image_path = line[len("process_image:"):]
                try:
                    image_tensor = preprocess_image(image_path)
                    result = predict(image_tensor)
                    print(json.dumps(result))
                    sys.stdout.flush()  # 确保输出被立即发送
                except Exception as e:
                    error_result = {"error": str(e)}
                    print(json.dumps(error_result))
                    sys.stdout.flush()
    except KeyboardInterrupt:
        print("服务终止", file=sys.stderr)
    
    print("Python推理服务已关闭", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(description="图像识别推理服务")
    parser.add_argument("--server", action="store_true", help="以服务模式运行")
    parser.add_argument("image_path", nargs="?", help="要处理的图像路径")
    parser.add_argument("model_path", help="模型路径")
    
    args = parser.parse_args()
    
    if args.server:
        run_server(args.model_path)
    else:
        # 单次处理模式
        if not args.image_path:
            print(json.dumps({"error": "缺少图像路径参数"}))
            return
            
        try:
            load_model(args.model_path)
            image_tensor = preprocess_image(args.image_path)
            result = predict(image_tensor)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()