import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/authenticate': 'http://localhost:4130',
      '/user': 'http://localhost:4130',
      '/users': 'http://localhost:4130',
      '/catering': 'http://localhost:4130',
      '/larksuite': 'http://localhost:4130',
      '/export_excel_file': 'http://localhost:4130',
      '/kiem_thuc_3_buoc': 'http://localhost:4130',
    },
  },
})