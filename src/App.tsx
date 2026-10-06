import { lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/_layout'
import { NotFound } from './pages/NotFound'
import { Dashboard } from './pages/Dashboard'

const FileConverter = lazy(() => import('./pages/FileConverter').then(module => ({ default: module.FileConverter })))
const FileCompress = lazy(() => import('./pages/FileCompress').then(module => ({ default: module.FileCompress })))
const SpeedTest = lazy(() => import('./pages/SpeedTest').then(module => ({ default: module.SpeedTest })))
const QrGenerator = lazy(() => import('./pages/QrGenerator').then(module => ({ default: module.QrGenerator })))
const QrReader = lazy(() => import('./pages/QrReader').then(module => ({ default: module.QrReader })))
const WcagScanner = lazy(() => import('./pages/WcagScanner').then(module => ({ default: module.WcagScanner })))
const Counter = lazy(() => import('./pages/Counter').then(module => ({ default: module.Counter })))
const ScreenshotAnnotator = lazy(() => import('./pages/ScreenshotAnnotator').then(module => ({ default: module.ScreenshotAnnotator })))
const JsonTools = lazy(() => import('./pages/JsonTools').then(module => ({ default: module.JsonTools })))
const JwtDecoder = lazy(() => import('./pages/JwtDecoder').then(module => ({ default: module.JwtDecoder })))
const EncoderDecoder = lazy(() => import('./pages/EncoderDecoder').then(module => ({ default: module.EncoderDecoder })))
const HashGenerator = lazy(() => import('./pages/HashGenerator').then(module => ({ default: module.HashGenerator })))
const IdGenerator = lazy(() => import('./pages/IdGenerator').then(module => ({ default: module.IdGenerator })))
const RegexTester = lazy(() => import('./pages/RegexTester').then(module => ({ default: module.RegexTester })))
const CronExplainer = lazy(() => import('./pages/CronExplainer').then(module => ({ default: module.CronExplainer })))
const TimestampConverter = lazy(() => import('./pages/TimestampConverter').then(module => ({ default: module.TimestampConverter })))
const SubnetCalculator = lazy(() => import('./pages/SubnetCalculator').then(module => ({ default: module.SubnetCalculator })))
const PasswordGenerator = lazy(() => import('./pages/PasswordGenerator').then(module => ({ default: module.PasswordGenerator })))
const PasswordChecker = lazy(() => import('./pages/PasswordChecker').then(module => ({ default: module.PasswordChecker })))

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
          <Route path="screenshot-annotator" element={<ScreenshotAnnotator />} />
          <Route path="file-converter" element={<FileConverter />} />
          <Route path="file-compress" element={<FileCompress />} />

          {/* Web */}
          <Route path="qr-generator" element={<QrGenerator />} />
          <Route path="qr-reader" element={<QrReader />} />
          <Route path="wcag-scanner" element={<WcagScanner />} />

          {/* Utilities */}
          <Route path="password-generator" element={<PasswordGenerator />} />
          <Route path="password-checker" element={<PasswordChecker />} />
          <Route path="counter" element={<Counter />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
