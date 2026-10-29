import fs from "node:fs"
import path from "path"
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, type Plugin } from 'vite'

/**
 * Serves and bundles `contract/generated/docs/index.html` so the in-app `/docs`
 * route can render the generated Redoc bundle in both `vite` dev and `vite build`.
 */
function redocStaticBundlePlugin(): Plugin {
  const docsRelPath = "contract/generated/docs/index.html"
  const docsAbsPath = path.resolve(import.meta.dirname, docsRelPath)

  return {
    name: "eirmis-redoc-static-bundle",
    closeBundle() {
      if (!fs.existsSync(docsAbsPath)) return
      const outPath = path.resolve(import.meta.dirname, "dist", docsRelPath)
      fs.mkdirSync(path.dirname(outPath), { recursive: true })
      fs.copyFileSync(docsAbsPath, outPath)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), redocStaticBundlePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@contract": path.resolve(import.meta.dirname, "./contract"),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(import.meta.dirname, ".")],
    },
  },
})
