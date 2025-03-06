import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useState } from "react";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className='min-h-screen bg-background'>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className='flex'>
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        {/* 添加左侧padding，在大屏幕上为侧边栏留出空间 */}
        <main className='flex-1 p-4 pt-16 md:ml-64 md:p-6 md:pt-16 transition-all duration-200'>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
