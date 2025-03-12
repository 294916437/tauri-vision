import { Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // 跟踪悬浮状态
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  // 当前主题的状态
  const [currentTheme, setCurrentTheme] = useState<string>("system");

  // 同步当前主题状态
  useEffect(() => {
    setCurrentTheme(theme || "system");
  }, [theme]);

  // 自定义菜单项组件，带有明确的悬浮效果
  const ThemeMenuItem = ({
    theme,
    label,
  }: {
    theme: "light" | "dark" | "system";
    label: string;
  }) => (
    <DropdownMenuItem
      onClick={() => setTheme(theme)}
      onMouseEnter={() => setHoveredItem(theme)}
      onMouseLeave={() => setHoveredItem(null)}
      className={`
        cursor-pointer px-3 py-2 text-sm rounded-md transition-all
        ${
          hoveredItem === theme
            ? "bg-primary text-primary-foreground font-medium"
            : "hover:bg-secondary text-foreground"
        }
        ${currentTheme === theme ? "font-bold" : ""}
      `}>
      {label}
      {currentTheme === theme && (
        <span className='ml-auto text-primary dark:text-primary'>✓</span>
      )}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className='outline-none cursor-pointer hover:scale-110 transition-transform'>
        <div className='relative p-1 rounded-md hover:bg-accent transition-colors'>
          {/* 亮色模式图标 */}
          {(theme === "light" ||
            (theme === "system" &&
              !window.matchMedia("(prefers-color-scheme: dark)").matches)) && (
            <Sun className='h-[1.2rem] w-[1.2rem]' />
          )}

          {/* 暗色模式图标 */}
          {(theme === "dark" ||
            (theme === "system" &&
              window.matchMedia("(prefers-color-scheme: dark)").matches)) && (
            <Moon className='h-[1.2rem] w-[1.2rem]' />
          )}

          <span className='sr-only'>切换主题</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-32 p-2'>
        <ThemeMenuItem theme='light' label='亮色' />
        <ThemeMenuItem theme='dark' label='暗色' />
        <ThemeMenuItem theme='system' label='系统默认' />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
