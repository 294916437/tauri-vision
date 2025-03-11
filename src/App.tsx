import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { ImageRecognition } from "@/pages/ImageRecognition";
import Dashboard from "@/pages/Dashboard";
import Layout from "@/components/Layout";
import ModelSettings from "@/pages/ModelSettings";
function App() {
  window.addEventListener("error", (event) => {
    console.error("全局错误:", event.error);
    event.preventDefault();
  });
  return (
    <ThemeProvider defaultTheme='system' storageKey='vision-match-theme'>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path='recognition' element={<ImageRecognition />} />
            <Route path='models' element={<ModelSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
