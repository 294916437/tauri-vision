import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state，下次渲染时将使用 fallback
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 您可以将错误日志上报到服务或打印到控制台
    console.error("组件错误:", error);
    console.error("错误信息:", errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，则使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return (
        <div className='p-4 rounded-md bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'>
          <h2 className='text-lg font-semibold text-red-800 dark:text-red-300'>组件加载失败</h2>
          <p className='mt-2 text-sm text-red-700 dark:text-red-400'>
            {this.state.error?.message || "发生未知错误"}
          </p>
          <button
            className='mt-3 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm dark:bg-red-800 dark:hover:bg-red-700 dark:text-red-200'
            onClick={() => this.setState({ hasError: false, error: null })}>
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
