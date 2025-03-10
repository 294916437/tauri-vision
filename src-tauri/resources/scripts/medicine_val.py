import sys
import torch
import torchvision.transforms as transforms
from PIL import Image
import json
import torchvision.models as models
import argparse
import time
import os

# 全局变量存储模型
model = None
transform = None
class_names = None

def get_class_names(model_dir):
    """从模型目录加载类别名称"""
    class_file = os.path.join(model_dir, "class_names.json")
    if os.path.exists(class_file):
        with open(class_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        # 尝试从训练数据文件夹获取类别名称
        try:
            data_dir = os.path.join(model_dir, '..', 'data', 'Medicine', 'train')
            if os.path.exists(data_dir):
                classes = sorted([d for d in os.listdir(data_dir) 
                                if os.path.isdir(os.path.join(data_dir, d))])
                # 保存类别名称到文件
                with open(class_file, 'w', encoding='utf-8') as f:
                    json.dump(classes, f, ensure_ascii=False)
                return classes
        except Exception as e:
            print(f"无法从训练目录获取类别: {e}", file=sys.stderr)
    
    print("警告：未找到类别名称文件，使用数字索引替代", file=sys.stderr)
    return [f"类别_{i}" for i in range(160)]  # 默认假设有160个类别

def load_model(model_path):
    """加载模型并准备推理环境"""
    global model, transform, class_names
    
    if model is None:
        print(f"加载模型: {model_path}", file=sys.stderr)
        try:
            # 获取模型目录
            model_dir = os.path.dirname(model_path)
            
            # 加载类别名称
            class_names = get_class_names(model_dir)
            num_classes = len(class_names)
            print(f"加载了 {num_classes} 个类别", file=sys.stderr)
            
            # 加载模型架构 - MobileNetV3 Small
            model = models.mobilenet_v3_small(weights=None)
            num_ftrs = model.classifier[3].in_features
            model.classifier[3] = torch.nn.Linear(num_ftrs, num_classes)
            
            # 加载预训练权重
            model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
            model.eval()
            
            # 初始化图像变换 (与训练时保持一致)
            transform = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            print("模型加载完成", file=sys.stderr)
        except Exception as e:
            print(f"模型加载失败: {str(e)}", file=sys.stderr)
            raise e
    return model

def preprocess_image(image_path):
    """预处理输入图像"""
    try:
        image = Image.open(image_path).convert('RGB')
        return transform(image).unsqueeze(0)  # 添加batch维度
    except Exception as e:
        print(f"图像预处理失败: {str(e)}", file=sys.stderr)
        raise e

def predict(image_tensor):
    """使用模型执行推理"""
    with torch.no_grad():
        outputs = model(image_tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]
        
        # 获取top-5最高概率的类别
        top_k = min(5, len(class_names))
        top_probs, top_idxs = torch.topk(probabilities, top_k)
        
        # 获取最高概率的类别
        predicted_idx = top_idxs[0].item()
        predicted_class = class_names[predicted_idx]
        confidence = top_probs[0].item()
        
        # 构建top-k结果
        top_predictions = []
        for i in range(top_k):
            idx = top_idxs[i].item()
            top_predictions.append({
                "class": class_names[idx],
                "probability": top_probs[i].item()
            })
        
        # 构建所有类别的概率字典 (可选，如果需要完整结果)
        # class_probs = {class_names[i]: prob.item() for i, prob in enumerate(probabilities)}
        
    return {
        "prediction": predicted_class,
        "confidence": confidence,
        "top_predictions": top_predictions
    }

def run_server(model_path):
    """运行服务模式，持续接收命令"""
    print("中医药图像识别服务已启动", file=sys.stderr)
    try:
        load_model(model_path)
    except Exception as e:
        print(f"服务启动失败: {str(e)}", file=sys.stderr)
        return
    
    try:
        while True:
            line = sys.stdin.readline().strip()
            if not line or line == "exit":
                break
                
            if line.startswith("process_image:"):
                image_path = line[len("process_image:"):]
                try:
                    start_time = time.time()
                    image_tensor = preprocess_image(image_path)
                    result = predict(image_tensor)
                    end_time = time.time()
                    print(f"推理耗时: {(end_time - start_time)*1000:.2f}ms", file=sys.stderr)
                    print(json.dumps(result, ensure_ascii=False))
                    sys.stdout.flush()  # 确保输出被立即发送
                except Exception as e:
                    error_result = {"error": str(e)}
                    print(json.dumps(error_result, ensure_ascii=False))
                    sys.stdout.flush()
    except KeyboardInterrupt:
        print("服务终止", file=sys.stderr)
    except Exception as e:
        print(f"服务异常: {str(e)}", file=sys.stderr)
    
    print("中医药图像识别服务已关闭", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(description="中医药图像识别推理服务")
    parser.add_argument("--server", action="store_true", help="以服务模式运行")
    parser.add_argument("--info", action="store_true", help="仅显示模型信息")
    parser.add_argument("image_path", nargs="?", help="要处理的图像路径")
    parser.add_argument("model_path", help="模型路径")
    
    args = parser.parse_args()
    
    if args.info:
        try:
            load_model(args.model_path)
            info = {
                "model_type": "MobileNetV3-Small",
                "num_classes": len(class_names),
                "image_size": "224x224",
                "classes": class_names[:10] + ["..."] if len(class_names) > 10 else class_names
            }
            print(json.dumps(info, ensure_ascii=False))
        except Exception as e:
            print(json.dumps({"error": str(e)}, ensure_ascii=False))
    elif args.server:
        run_server(args.model_path)
    else:
        # 单次处理模式
        if not args.image_path:
            print(json.dumps({"error": "缺少图像路径参数"}, ensure_ascii=False))
            return
            
        try:
            load_model(args.model_path)
            image_tensor = preprocess_image(args.image_path)
            result = predict(image_tensor)
            print(json.dumps(result, ensure_ascii=False))
        except Exception as e:
            print(json.dumps({"error": str(e)}, ensure_ascii=False))

if __name__ == "__main__":
    main()