import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { FileConverter } from './pages/FileConverter'
import { FileCompress } from './pages/FileCompress'
import { SpeedTest } from './pages/SpeedTest'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="file-converter" element={<FileConverter />} />
          <Route path="file-compress" element={<FileCompress />} />
          <Route path="speed-test" element={<SpeedTest />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
