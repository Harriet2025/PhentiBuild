import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Dev proxy: the browser only ever talks to localhost:5173, so the
    // session cookie is first-party and no CORS setup is needed.
    //   /api                 → Django REST backend (python manage.py runserver)
    //   /PhentiBuild/backend → legacy PHP backend on XAMPP (VITE_BACKEND=php)
    // In production, web/vercel.json does the same job for /api.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: false,
      },
      '/PhentiBuild/backend': {
        target: 'http://localhost:80',
        changeOrigin: true,
      },
    },
  },
})
