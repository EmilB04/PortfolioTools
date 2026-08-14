import { LayoutDashboard, FileInput, FileArchive, Gauge, QrCode, Accessibility, DoorOpen, ImageDown } from 'lucide-react'

export const navItems = [
  { key: 'dashboard', icon: LayoutDashboard, to: '/' },
  { key: 'snapdown', icon: ImageDown, to: '/snapdown' },
  { key: 'fileConverter', icon: FileInput, to: '/file-converter' },
  { key: 'fileCompress', icon: FileArchive, to: '/file-compress' },
  { key: 'qrGenerator', icon: QrCode, to: '/qr-generator' },
  { key: 'wcagScanner', icon: Accessibility, to: '/wcag-scanner' },
  { key: 'speedTest', icon: Gauge, to: '/speed-test' },
  { key: 'counter', icon: DoorOpen, to: '/counter' },
] as const
