import { Window } from "@tauri-apps/api/window";
import { useState, useEffect } from "react";
import { X, Minus, Square, Maximize2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  // 跟踪按钮悬停状态
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  // 获取当前窗口实例
  const appWindow = Window.getCurrent();

  // 检查窗口状态
  useEffect(() => {
    const checkMaximize = async () => {
      try {
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      } catch (e) {
        console.error("Failed to check window state:", e);
      }
    };

    checkMaximize();

    // 监听窗口大小变化
    const setupListener = async () => {
      try {
        const unlisten = await appWindow.onResized(() => {
          checkMaximize();
        });

        return unlisten;
      } catch (err) {
        console.error("Failed to set up resize listener:", err);
        return () => {}; // 返回空函数作为fallback
      }
    };

    let cleanupFn: (() => void) | undefined;

    setupListener().then((unlisten) => {
      cleanupFn = unlisten;
    });

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, []);

  // 窗口控制函数
  const handleMinimize = () => {
    try {
      appWindow.minimize();
    } catch (error) {
      console.error("Failed to minimize window:", error);
    }
  };

  const handleToggleMaximize = () => {
    try {
      isMaximized ? appWindow.unmaximize() : appWindow.maximize();
    } catch (error) {
      console.error("Failed to toggle maximize:", error);
    }
  };

  const handleClose = () => {
    try {
      appWindow.close();
    } catch (error) {
      console.error("Failed to close window:", error);
    }
  };
  return (
    <div
      data-tauri-drag-region
      className='h-10 flex items-center justify-between bg-background border-b border-border select-none touch-none'>
      {/* 应用图标和名称 */}
      <div className='flex items-center justify-between px-6 ' data-tauri-drag-region>
        <img src='/app-icon.png' alt='App Icon' className='w-8 h-8 mr-2' />
        <span className='font-bold text-md text-foreground/90' data-tauri-drag-region>
          Whale Vision
        </span>
      </div>

      {/* 中部可拖拽区域 */}
      <div className='flex-grow h-full' data-tauri-drag-region></div>

      {/* 控制按钮 */}
      <div className='flex items-center'>
        <ThemeToggle />

        <Button
          onClick={handleMinimize}
          aria-label='最小化窗口'
          variant='ghost'
          size='icon'
          className='h-10 w-10 rounded-none shadow-none hover:bg-secondary/70 focus-visible:ring-0 active:translate-y-[1px]'
          onMouseEnter={() => setHoveredButton("minimize")}
          onMouseLeave={() => setHoveredButton(null)}>
          <Minus
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              hoveredButton === "minimize" && "scale-110"
            )}
          />
        </Button>

        <Button
          onClick={handleToggleMaximize}
          aria-label={isMaximized ? "还原窗口" : "最大化窗口"}
          variant='ghost'
          size='icon'
          className='h-10 w-10 rounded-none shadow-none hover:bg-secondary/70 focus-visible:ring-0 active:translate-y-[1px]'
          onMouseEnter={() => setHoveredButton("maximize")}
          onMouseLeave={() => setHoveredButton(null)}>
          {isMaximized ? (
            <Square
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                hoveredButton === "maximize" && "scale-110"
              )}
            />
          ) : (
            <Maximize2
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                hoveredButton === "maximize" && "scale-110"
              )}
            />
          )}
        </Button>

        <Button
          onClick={handleClose}
          aria-label='关闭窗口'
          variant='ghost'
          size='icon'
          className='h-10 w-10 rounded-none shadow-none hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-0 active:translate-y-[1px]'
          onMouseEnter={() => setHoveredButton("close")}
          onMouseLeave={() => setHoveredButton(null)}>
          <X
            className={cn(
              "h-4 w-4 transition-transform",
              hoveredButton === "close" && "scale-110"
            )}
          />
        </Button>
      </div>
    </div>
  );
}
