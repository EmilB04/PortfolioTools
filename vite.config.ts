import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { seoPages } from './scripts/seo.ts'

export default defineConfig({
  plugins: [react(), seoPages()],
})
