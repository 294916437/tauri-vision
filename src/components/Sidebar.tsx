import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BarChart, Home, ImageIcon, LayersIcon, Settings, X } from "lucide-react";
import { Button } from "./ui/button";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const routes = [
    {
      icon: Home,
      label: "工作台",
      href: "/",
    },
    {
      icon: ImageIcon,
      label: "图像识别",
      href: "/recognition",
    },
    {
      icon: BarChart,
      label: "历史记录",
      href: "/history",
    },
    {
      icon: LayersIcon,
      label: "模型管理",
      href: "/models",
    },
    {
      icon: Settings,
      label: "系统设置",
      href: "/settings",
    },
  ];

  return (
    <>
      {/* 移动端遮罩层 */}
      {open && (
        <div
          className='fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden'
          onClick={() => setOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r bg-background p-4 pt-16 transition-all duration-300 ease-in-out",
          // 在移动设备上根据open状态决定是否显示
          open ? "translate-x-0 shadow-lg" : "-translate-x-full",
          // 在桌面设备上始终显示
          "md:translate-x-0"
        )}>
        <div className='absolute right-4 top-4 md:hidden'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setOpen(false)}
            className='hover:rotate-90 transition-transform duration-200'>
            <X className='h-5 w-5' />
          </Button>
        </div>

        <nav className='mt-8 space-y-1.5'>
          {routes.map((route) => (
            <NavLink
              key={route.href}
              to={route.href}
              end={route.href === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                  "hover:bg-accent/50 active:scale-[0.98]",
                  isActive
                    ? "bg-primary/10 text-primary before:absolute before:top-1 before:bottom-1 before:left-0 before:w-1 before:rounded-full before:bg-primary"
                    : "hover:text-accent-foreground"
                )
              }>
              {({ isActive }) => (
                <>
                  <route.icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      "group-hover:scale-110",
                      isActive && "text-primary"
                    )}
                  />
                  <span
                    className={cn(
                      "transition-colors duration-200",
                      isActive && "font-semibold text-primary"
                    )}>
                    {route.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
