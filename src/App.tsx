import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/_layout'
import { Dashboard } from './pages/Dashboard'
import { FileConverter } from './pages/FileConverter'
import { FileCompress } from './pages/FileCompress'
import { SpeedTest } from './pages/SpeedTest'
import { QrGenerator } from './pages/QrGenerator'
import { WcagScanner } from './pages/WcagScanner'
import { Counter } from './pages/Counter'
import { Snapdown } from './pages/Snapdown'
import { JsonTools } from './pages/JsonTools'
import { JwtDecoder } from './pages/JwtDecoder'
import { EncoderDecoder } from './pages/EncoderDecoder'
import { HashGenerator } from './pages/HashGenerator'
import { IdGenerator } from './pages/IdGenerator'
import { RegexTester } from './pages/RegexTester'
import { CronExplainer } from './pages/CronExplainer'
import { TimestampConverter } from './pages/TimestampConverter'
import { SubnetCalculator } from './pages/SubnetCalculator'
import { PasswordGenerator } from './pages/PasswordGenerator'

// Paths must stay in sync with `src/tools/registry.ts`, which drives the sidebar
// and the dashboard cards.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />

          {/* Developer */}
          <Route path="json" element={<JsonTools />} />
          <Route path="jwt-decoder" element={<JwtDecoder />} />
          <Route path="encoder" element={<EncoderDecoder />} />
          <Route path="hash-generator" element={<HashGenerator />} />
          <Route path="id-generator" element={<IdGenerator />} />
          <Route path="regex-tester" element={<RegexTester />} />

          {/* Time & scheduling */}
          <Route path="cron" element={<CronExplainer />} />
          <Route path="timestamp" element={<TimestampConverter />} />

          {/* Network */}
          <Route path="subnet" element={<SubnetCalculator />} />
          <Route path="speed-test" element={<SpeedTest />} />

          {/* Files & media */}
          <Route path="snapdown" element={<Snapdown />} />
          <Route path="file-converter" element={<FileConverter />} />
          <Route path="file-compress" element={<FileCompress />} />

          {/* Web */}
          <Route path="qr-generator" element={<QrGenerator />} />
          <Route path="wcag-scanner" element={<WcagScanner />} />

          {/* Utilities */}
          <Route path="password-generator" element={<PasswordGenerator />} />
          <Route path="counter" element={<Counter />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
