import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { ImageRecognition } from "@/pages/ImageRecognition";
import Dashboard from "@/pages/Dashboard";
import Layout from "@/components/Layout";
import ModelSettings from "@/pages/ModelSettings";
import ImageHistory from "@/pages/ImageHistory";
import { TitleBar } from "./components/custom/title-bar";

function App() {
  // 全局错误处理器
  window.addEventListener("error", (event) => {
    console.error("全局错误:", event.error);
    event.preventDefault();
  });

  return (
    <ThemeProvider defaultTheme='system' storageKey='vision-match-theme'>
      {/* 应用容器 - 添加了 flex 和 h-screen 以支持垂直布局 */}
      <div className='flex flex-col h-screen overflow-hidden bg-background'>
        {/* 自定义标题栏 - 固定在顶部 */}
        <TitleBar />

        {/* 主内容区域 - flex-grow 使其填充剩余空间 */}
        <div className='flex-grow overflow-auto'>
          <BrowserRouter>
            <Routes>
              <Route path='/' element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path='recognition' element={<ImageRecognition />} />
                <Route path='models' element={<ModelSettings />} />
                <Route path='history' element={<ImageHistory />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
