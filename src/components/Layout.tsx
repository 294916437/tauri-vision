import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useState } from "react";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className='h-full bg-background'>
      <div className='flex h-full'>
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <main className='flex-1 p-4 md:ml-64 md:p-6 transition-all duration-200'>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
