import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import Dashboard from "@/pages/Dashboard";
import { ImageRecognition } from "@/pages/ImageRecognition";
import Layout from "@/components/Layout";

function App() {
  return (
    <ThemeProvider defaultTheme='system' storageKey='vision-match-theme'>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path='recognition' element={<ImageRecognition />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
