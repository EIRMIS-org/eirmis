import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import fs from 'node:fs'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'serve-contract-docs',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/docs/index.html' || req.url === '/docs/index.html/') {
            const docsPath = path.resolve(import.meta.dirname, 'contract/generated/docs/index.html')
            if (fs.existsSync(docsPath)) {
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              return fs.createReadStream(docsPath).pipe(res)
            }
          }
          next()
        })
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
