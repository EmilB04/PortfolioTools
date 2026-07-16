import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/_layout'
import { Dashboard } from './pages/Dashboard'
import { FileConverter } from './pages/FileConverter'
import { FileCompress } from './pages/FileCompress'
import { SpeedTest } from './pages/SpeedTest'
import { QrGenerator } from './pages/QrGenerator'
import { WcagScanner } from './pages/WcagScanner'
import { Counter } from './pages/Counter'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="file-converter" element={<FileConverter />} />
          <Route path="file-compress" element={<FileCompress />} />
          <Route path="speed-test" element={<SpeedTest />} />
          <Route path="qr-generator" element={<QrGenerator />} />
          <Route path="wcag-scanner" element={<WcagScanner />} />
          <Route path="counter" element={<Counter />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
