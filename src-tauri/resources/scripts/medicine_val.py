import sys
import torch
import torchvision.transforms as transforms
from PIL import Image
import json
import torchvision.models as models
import argparse
import sys
import io
# 全局变量存储模型
model = None
transform = None
class_names = None
# 强制设置标准输出为UTF-8编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# 预定义类别列表 - 中医药材名称
CLASS_NAMES = [
    "三七", "丹参", "乌梅", "五加皮", "五味子", "五灵脂", "人参", "人参切片",
    "仙鹤草", "何首乌", "佛手", "佩兰", "侧柏叶", "僵蚕", "党参", "全蝎",
    "决明子", "刺史", "前胡", "北沙参块", "北沙参条", "升麻", "半夏", "厚朴",
    "合欢皮", "土鳖虫", "地榆", "地骨皮", "地龙", "墨旱莲", "夏枯草", "大腹皮",
    "大血藤", "大青叶", "天冬", "天南星", "天葵子", "天麻块", "天麻片", "女贞子",
    "姜黄", "射干", "小茴香", "山楂", "山茱萸", "山药", "巴戟天", "干姜",
    "木香", "杜仲", "板蓝根", "枳壳条", "枳壳片", "枳实", "枸杞子", "柏子仁",
    "柴胡", "桃仁", "桑椹", "桑螵蛸", "槐花", "水牛角", "水红花子", "沉香",
    "泽兰", "浙贝母", "火麻仁", "灵芝", "炮姜", "牛膝", "牡丹皮", "牡蛎",
    "玉竹条", "玉竹片", "珍珠母", "甘草", "白头翁", "白扁豆", "白术", "白矾",
    "白芍", "白花蛇舌草", "白茅根", "白蔻", "百合", "百部", "益母草", "知母",
    "石斛", "石膏", "石菖蒲", "砂仁", "神曲", "穿山甲", "穿心莲", "竹茹",
    "紫花地丁", "紫草", "紫菀", "红花", "红蔻", "细辛", "络石藤", "续断",
    "罗汉果", "羌活", "肉桂", "肉苁蓉根", "肉苁蓉片", "肉豆蔻", "艾叶", "苍术",
    "苦参", "茯苓", "茵陈", "荆芥", "草寇", "草果", "荔枝核", "莱菔子",
    "莲子心", "菟丝子", "葛根", "蒲公英", "蒲黄", "薏苡仁", "虎杖", "虫草",
    "蛇床子", "蝉蜕", "覆盆子", "谷芽", "贯众", "赤石脂", "赤芍", "路路通",
    "辛夷", "远志", "连翘", "通草", "郁金", "酸枣仁", "野菊花", "金钱草",
    "金银花", "钩藤", "防风", "阿胶", "附子", "陈皮", "青蒿", "首乌藤块",
    "首乌藤片", "香附", "鳖甲", "鸡内金", "鸡血藤", "麦冬", "麦芽", "黄柏",
    "黄精", "黄芩", "龙骨"
]

# 安全的JSON输出函数
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
    """加载模型并准备推理环境"""
    global model, transform, class_names
    
    if model is None:
        print(f"加载模型: {model_path}", file=sys.stderr)
        try:
            # 直接使用静态类别列表
            class_names = CLASS_NAMES
            
            # 加载模型权重以获取实际类别数
            state_dict = torch.load(model_path)
            actual_num_classes = state_dict['classifier.3.weight'].size(0)
            
            # 创建模型架构
            model = models.mobilenet_v3_small(weights=None)
            num_ftrs = model.classifier[3].in_features
            model.classifier[3] = torch.nn.Linear(num_ftrs, actual_num_classes)
            
            # 加载预训练权重
            model.load_state_dict(state_dict)
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
        print(f"处理图像: {image_path}", file=sys.stderr)
        image = Image.open(image_path).convert('RGB')
        return transform(image).unsqueeze(0)  # 添加batch维度
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
                class_names[top_idxs[i].item()]: float(top_probs[i].item())  # 确保是原生Python float
                for i in range(top_n)
            }
            
        return {
            "prediction": predicted_class,
            "confidence": float(confidence),  # 确保是原生Python float
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
    print("中医药图像识别服务已启动", file=sys.stderr)
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
    
    print("中医药图像识别服务已关闭", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(description="中医药图像识别推理服务")
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
            safe_json_print(result)  # 添加缺失的打印输出
        except Exception as e:
            safe_json_print({
                "prediction": "处理失败",
                "confidence": 0.0,
                "class_probabilities": {},
                "error": str(e)
            })

if __name__ == "__main__":
    main()