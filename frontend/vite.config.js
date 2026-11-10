import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Khi phát triển: `npm run dev` và backend chạy ở cổng 8081 (Studio, gồm cả API công khai).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:8081', '/editor': 'http://127.0.0.1:8081', '/media': 'http://127.0.0.1:8081' } },
})
