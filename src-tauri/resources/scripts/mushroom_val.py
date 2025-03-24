import torch
from torchvision import transforms
from PIL import Image
from torchvision import models
import torch.nn as nn
import json
import sys
import io
import argparse

# 全局变量存储模型和变换
model = None
transform = None
class_names = None

# 强制设置标准输出为UTF-8编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# 预定义类别列表 - 蘑菇名称
CLASS_NAMES = ["美味蘑菇", "黄孢环柄菇", "美洲红褶伞", "奥古斯塔鹅膏菌", "褐变鹅膏菌", "鳞盖鹅膏菌", "黄鳞鹅膏菌",
                "毒蝇伞", "桃红鹅膏菌", "毒鹅膏菌", "白鹅膏菌", "蜜环菌", "无环柄菇", "珊瑚齿菌", "蛋黄菇",
                "苍白牛肝菌", "春王牛肝菌", "加州鸡油菌", "朱红鸡油菌", "鳞柄多孔菌", "褐环褶菇", "绿褶菇",
                "紫丁香蘑菇", "云母鬼伞", "兔粪鬼伞", "毛头鬼伞", "光柄鸟巢菌", "隐孔包", "迷宫革菌",
                "流产粉褶菌", "金针菇", "芒斯拟层孔菌", "盔孢伞", "树舌灵芝", "柯蒂斯灵芝", "俄勒冈灵芝",
                "铁杉灵芝", "鹦鹉小菇", "栅孔菌", "灰树花", "锈鳞伞", "珊瑚猴头菌", "猴头菇", "橙黄小脆柄菇",
                "黄孢环柄菇", "砖红丝膜菌", "虾夷菇", "树脂革菌", "紫褐喇叭菌", "泪菇", "靛蓝乳菇", "硫磺菌",
                "松杉卧孔菌", "红菇", "红褶伞", "白环柄菇", "树皮网", "梨包", "梨形马勃", "血红菇", "橙盖小菇",
                "发光脐菇", "西瓜红柄小香菇", "草地裸伞", "环纹斑褶菇", "凤头斑褶菇", "苦味小香菇", "染匠蘑菇", 
                "胶革菌", "桔黄褶菌", "平菇", "肺形侧耳", "鹿纹蘑菇", "脆柄菇", "银耳", "艾伦裸盖菇", "阿兹特克裸盖菇", 
                "天蓝裸盖菇", "青变裸盖菇", "古巴裸盖菇", "蓝帽裸盖菇", "墨西哥裸盖菇", "新哈拉帕裸盖菇", "卵囊裸盖菇", 
                "薄皮裸盖菇", "萨波特克裸盖菇", "饰柄网孢牛肝菌", "晚生肉伞", "裂褶菌", "牡蛎革菌", "变绿环锈伞", 
                "皱环球盖菇", "美洲乳牛肝菌", "粘盖牛肝菌", "斯普拉格乳牛肝菌", "黑绒革耳", "桦木蹄", "凸纹革菌", 
                "云芝", "双色革菌", "马瑞利亚松口蘑", "红鳞伞", "糠秕小菇", "苦牛肝菌", "红褐牛肝菌", "粪生伞"]

def safe_json_print(data):
    """安全地将对象打印为JSON，处理编码问题"""
    try:
        # 确保每个对象都可以被JSON序列化
        json_str = json.dumps(data, ensure_ascii=True)
        print(json_str)
        sys.stdout.flush()
    except Exception as e:
        print(f"JSON序列化失败: {e}", file=sys.stderr)
        # 返回基本格式的错误JSON
        fallback = {
            "prediction": "错误",
            "confidence": 0.0,
            "class_probabilities": {},
            "error": f"JSON序列化失败: {str(e)}"
        }
        print(json.dumps(fallback, ensure_ascii=True))
        sys.stdout.flush()

def load_model(model_path):
    """加载预训练模型和类别映射"""
    global model, transform, class_names
    
    if model is None:
        print(f"加载模型: {model_path}", file=sys.stderr)
        try:
            # 使用预定义的类别列表
            class_names = CLASS_NAMES
            
            # 加载预训练模型
            checkpoint = torch.load(model_path, map_location="cpu")
            
            # 创建模型结构
            model = models.resnet50(weights=None)
            model.fc = nn.Sequential(
                nn.Dropout(0.5),
                nn.Linear(model.fc.in_features, 512),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(512, len(class_names))
            )
            
            # 加载模型权重
            model.load_state_dict(checkpoint['model_state_dict'])
            model.eval()  # 设置为评估模式
            
            # 初始化图像转换
            transform = transforms.Compose([
                transforms.Resize((224, 224)),
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
        print(f"处理图像: {image_path}", file=sys.stderr)
        image = Image.open(image_path).convert('RGB')
        image_tensor = transform(image)
        return image_tensor.unsqueeze(0)  # 添加batch维度
    except Exception as e:
        print(f"图像预处理失败: {str(e)}", file=sys.stderr)
        raise e

def predict(image_tensor, top_n=10):
    """使用模型执行推理"""
    try:
        with torch.no_grad():
            outputs = model(image_tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]
            
            # 获取top_n最高概率的类别
            top_n = min(top_n, len(class_names))  # 确保不超过类别总数
            top_probs, top_idxs = torch.topk(probabilities, top_n)
            
            # 获取最高概率的类别作为主预测结果
            predicted_class = class_names[top_idxs[0].item()]
            confidence = top_probs[0].item()
            
            # 构建top_n类别的概率字典
            class_probabilities = {
                class_names[top_idxs[i].item()]: float(top_probs[i].item())
                for i in range(top_n)
            }
            
        return {
            "prediction": predicted_class,
            "confidence": float(confidence),
            "class_probabilities": class_probabilities
        }
    except Exception as e:
        print(f"预测过程出错: {str(e)}", file=sys.stderr)
        # 返回格式完整的错误结果
        return {
            "prediction": "错误",
            "confidence": 0.0,
            "class_probabilities": {},
            "error": str(e)
        }

def run_server(model_path):
    """运行服务模式，持续接收命令"""
    print("蘑菇图像识别服务已启动", file=sys.stderr)
    try:
        load_model(model_path)
    except Exception as e:
        print(f"服务启动失败: {str(e)}", file=sys.stderr)
        # 即使在启动失败的情况下也返回格式正确的错误
        safe_json_print({
            "prediction": "服务启动失败",
            "confidence": 0.0, 
            "class_probabilities": {},
            "error": str(e)
        })
        return
    
    try:
        while True:
            line = sys.stdin.readline().strip()
            if not line or line == "exit":
                break
                
            if line.startswith("process_image:"):
                image_path = line[len("process_image:"):]
                print(f"接收到图像处理请求: {image_path}", file=sys.stderr)
                
                try:
                    image_tensor = preprocess_image(image_path)
                    result = predict(image_tensor)
                    # 使用安全的JSON打印
                    safe_json_print(result)
                except Exception as e:
                    error_msg = str(e)
                    print(f"处理图像时出错: {error_msg}", file=sys.stderr)
                    
                    # 确保返回完整的错误结构
                    error_result = {
                        "prediction": "处理失败",
                        "confidence": 0.0,
                        "class_probabilities": {},
                        "error": error_msg
                    }
                    safe_json_print(error_result)
    except KeyboardInterrupt:
        print("服务终止", file=sys.stderr)
    except Exception as e:
        print(f"服务异常: {str(e)}", file=sys.stderr)
    
    print("蘑菇图像识别服务已关闭", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(description="蘑菇图像识别推理服务")
    parser.add_argument("--server", action="store_true", help="以服务模式运行")
    parser.add_argument("image_path", nargs="?", help="要处理的图像路径")
    parser.add_argument("model_path", help="模型路径")
    
    args = parser.parse_args()
    
    if args.server:
        run_server(args.model_path)
    else:
        # 单次处理模式
        if not args.image_path:
            safe_json_print({
                "prediction": "错误",
                "confidence": 0.0,
                "class_probabilities": {},
                "error": "缺少图像路径参数"
            })
            return
            
        try:
            load_model(args.model_path)
            image_tensor = preprocess_image(args.image_path)
            result = predict(image_tensor, top_n=10)
            safe_json_print(result)
        except Exception as e:
            safe_json_print({
                "prediction": "处理失败",
                "confidence": 0.0,
                "class_probabilities": {},
                "error": str(e)
            })

if __name__ == "__main__":
    main()