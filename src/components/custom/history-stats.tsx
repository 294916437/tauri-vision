import { HistoryStats as HistoryStatsType } from "@/lib/types";
import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart } from "lucide-react";

interface HistoryStatsProps {
  stats: HistoryStatsType;
}

export function HistoryStats({ stats }: HistoryStatsProps) {
  // 安全地计算百分比，避免除以零
  const safePercent = (value: number, total: number) => {
    if (total === 0) return 0;
    return (value / total) * 100;
  };

  // 获取成功率和失败率等数据
  const statRates = useMemo(() => {
    return {
      successRate: safePercent(stats.success, stats.total),
      failureRate: safePercent(stats.failed, stats.total),
      errorRate: safePercent(stats.error, stats.total),
      pendingRate: safePercent(stats.pending, stats.total),
      processingRate: safePercent(stats.processing, stats.total),
    };
  }, [stats]);
  return (
    <div className='space-y-8'>
      <div className='grid gap-6 md:grid-cols-4'>
        <Card className='bg-background shadow-sm'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>总记录数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.total}</div>
            <p className='text-xs text-muted-foreground mt-1'>所有历史识别任务</p>
          </CardContent>
        </Card>

        <Card className='bg-background shadow-sm'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>成功任务</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-500'>{stats.success}</div>
            <p className='text-xs text-muted-foreground mt-1'>
              成功率: {statRates.successRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className='bg-background shadow-sm'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>失败任务</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-destructive'>{stats.failed}</div>
            <p className='text-xs text-muted-foreground mt-1'>
              失败率: {statRates.failureRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className='bg-background shadow-sm'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>平均置信度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{(stats.avgConfidence * 100).toFixed(1)}%</div>
            <p className='text-xs text-muted-foreground mt-1'>成功识别的平均置信水平</p>
          </CardContent>
        </Card>
      </div>

      <Card className='bg-background shadow-sm'>
        <CardHeader>
          <CardTitle>统计分析</CardTitle>
          <CardDescription>更多详细的统计分析功能正在开发中...</CardDescription>
        </CardHeader>
        <CardContent className='h-[300px] flex items-center justify-center'>
          <div className='text-center text-muted-foreground'>
            <BarChart className='h-16 w-16 mx-auto mb-4 opacity-20' />
            <p>高级统计分析功能即将推出</p>
            <p className='text-sm mt-2'>敬请期待更多功能！</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
