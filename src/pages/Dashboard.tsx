import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart, ImageIcon, LayersIcon, Settings } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "react-router-dom";
export default function Dashboard() {
  const features = [
    {
      title: "图像识别",
      description: "上传图像并获取AI识别结果",
      icon: <ImageIcon className='h-6 w-6' />,
      link: "/recognition",
      color: "bg-blue-100 dark:bg-blue-900/20",
      textColor: "text-blue-700 dark:text-blue-400",
    },
    {
      title: "历史记录",
      description: "查看和管理您的识别历史",
      icon: <BarChart className='h-6 w-6' />,
      link: "/history",
      color: "bg-amber-100 dark:bg-amber-900/20",
      textColor: "text-amber-700 dark:text-amber-400",
    },
    {
      title: "模型管理",
      description: "管理和配置识别模型",
      icon: <LayersIcon className='h-6 w-6' />,
      link: "/models",
      color: "bg-green-100 dark:bg-green-900/20",
      textColor: "text-green-700 dark:text-green-400",
    },
    {
      title: "系统设置",
      description: "调整系统参数和偏好设置",
      icon: <Settings className='h-6 w-6' />,
      link: "/settings",
      color: "bg-purple-100 dark:bg-purple-900/20",
      textColor: "text-purple-700 dark:text-purple-400",
    },
  ];

  return (
    <div className='container py-6'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold tracking-tight'>欢迎使用图像识别工作台</h1>
        <p className='mt-2 text-muted-foreground'>上传您的图像，利用AI技术进行智能识别分析</p>
      </div>

      <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
        {features.map((feature, index) => (
          <Card key={index} className='overflow-hidden'>
            <CardHeader className={`flex flex-row items-center gap-4 ${feature.color}`}>
              <div className={`rounded-lg p-2 ${feature.textColor}`}>{feature.icon}</div>
              <div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription className='mt-1'>{feature.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className='pt-4'>
              <Link
                to={feature.link}
                className={buttonVariants({ variant: "outline", className: "w-full" })}>
                进入
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='mt-10 rounded-lg border bg-card p-6 shadow-sm'>
        <h2 className='text-2xl font-semibold'>使用指南</h2>
        <ol className='mt-4 list-decimal space-y-2 pl-6'>
          <li>在"图像识别"页面上传您需要分析的图像</li>
          <li>系统将自动处理您的图像并返回识别结果</li>
          <li>在"模型管理"中选择不同模型来识别各种图像</li>
          <li>您可以查看识别的详细信息并保存结果</li>
          <li>在"历史记录"中查看和管理之前的识别任务</li>
        </ol>
      </div>
    </div>
  );
}
