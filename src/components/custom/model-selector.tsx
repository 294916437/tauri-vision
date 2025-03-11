import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { ModelInfo } from "@/lib/types";

interface ModelSelectorProps {
  models?: ModelInfo[];
  activeModelId?: string;
  onSelectModel: (modelId: string) => void;
  loading?: boolean;
}

// 完全使用原生元素实现，避免shadcn/ui组件的问题
export function ModelSelector({
  models,
  activeModelId,
  onSelectModel,
  loading = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 安全处理数据
  const safeModels = Array.isArray(models) ? models : [];
  const activeModel = safeModels.find((model) => model?.id === activeModelId);

  // 搜索过滤
  const filteredModels = safeModels.filter((model) =>
    model?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      // 打开时聚焦搜索输入框
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className='relative' ref={containerRef}>
      {/* 自定义触发按钮 - 增强悬停效果 */}
      <button
        type='button'
        className={cn(
          "flex w-[300px] items-center justify-between rounded-md border border-input",
          "bg-background px-4 py-2 text-sm font-medium",
          "transition-all duration-200 ease-in-out",
          "hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          open ? "border-primary/50 bg-accent/50" : "", // 打开状态突出显示
          loading ? "opacity-50 cursor-not-allowed" : ""
        )}
        onClick={() => !loading && setOpen(!open)}
        disabled={loading}
        aria-expanded={open}
        aria-controls='model-selector-dropdown'>
        {loading ? (
          <div className='flex items-center gap-2'>
            <svg
              className='animate-spin h-4 w-4 text-gray-500'
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'>
              <circle
                className='opacity-25'
                cx='12'
                cy='12'
                r='10'
                stroke='currentColor'
                strokeWidth='4'></circle>
              <path
                className='opacity-75'
                fill='currentColor'
                d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
            </svg>
            <span>加载中...</span>
          </div>
        ) : (
          <>
            <span className='truncate'>{activeModel?.name || "选择模型..."}</span>
            <svg
              className={cn(
                "h-4 w-4 shrink-0 ml-2 transition-transform duration-200",
                open ? "rotate-180 text-primary" : "text-muted-foreground"
              )}
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 9l-7 7-7-7'
              />
            </svg>
          </>
        )}
      </button>

      {/* 自定义下拉菜单 - 使用实色背景和更强的阴影 */}
      {open && (
        <div
          id='model-selector-dropdown'
          className='absolute z-50 w-[300px] mt-1 rounded-md border border-border bg-white dark:bg-gray-900 shadow-lg animate-in fade-in-80'
          style={{ top: "calc(100% + 5px)", left: 0, maxHeight: "400px", overflowY: "auto" }}>
          <div className='flex flex-col'>
            {/* 搜索输入框 - 明显的背景区分 */}
            <div className='sticky top-0 z-10 flex items-center border-b px-3 bg-gray-100 dark:bg-gray-800 shadow-sm'>
              <svg
                className='h-4 w-4 shrink-0 text-primary mr-2'
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                />
              </svg>
              <input
                ref={inputRef}
                className='flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50'
                placeholder='搜索模型...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* 列表项 - 统一高度和完全不透明的背景色 */}
            <div className='max-h-[300px] overflow-auto overscroll-contain'>
              {filteredModels.length === 0 ? (
                <div className='py-6 text-center text-sm bg-white dark:bg-gray-900'>
                  未找到模型
                </div>
              ) : (
                filteredModels.map((model, index) => {
                  const isActive = activeModelId === model.id;
                  return (
                    <div
                      key={model.id}
                      className={cn(
                        "relative flex h-10 cursor-pointer select-none items-center px-3 py-1.5 text-sm",
                        "border-l-2 transition-all duration-200 ease-in-out",
                        // 悬停和选中动效
                        "hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary",
                        isActive
                          ? "border-l-primary bg-primary/10 dark:bg-primary/20 font-medium"
                          : "border-l-transparent",
                        // 完全不透明的交替背景色
                        index % 2 === 0
                          ? "bg-white dark:bg-gray-900"
                          : "bg-gray-50 dark:bg-gray-850"
                      )}
                      onClick={() => {
                        if (model && model.id) {
                          onSelectModel(model.id);
                          setOpen(false);
                          setSearchQuery("");
                        }
                      }}
                      role='option'
                      aria-selected={isActive}>
                      <span
                        className={cn(
                          "mr-2 h-4 w-4 flex items-center justify-center transition-opacity",
                          isActive ? "opacity-100 text-primary" : "opacity-0"
                        )}>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          className='h-4 w-4'>
                          <path d='M20 6L9 17l-5-5' />
                        </svg>
                      </span>
                      <span className='truncate font-medium'>{model.name}</span>

                      {/* 添加右侧图标增强交互感 */}
                      <span
                        className={cn(
                          "ml-auto transition-opacity",
                          "opacity-0 group-hover:opacity-70"
                        )}>
                        {isActive ? (
                          <svg
                            className='h-4 w-4'
                            xmlns='http://www.w3.org/2000/svg'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'>
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M5 13l4 4L19 7'
                            />
                          </svg>
                        ) : (
                          <svg
                            className='h-4 w-4'
                            xmlns='http://www.w3.org/2000/svg'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'>
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M9 5l7 7-7 7'
                            />
                          </svg>
                        )}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
