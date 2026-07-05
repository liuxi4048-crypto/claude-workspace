import { defineConfig } from 'vite'

// GitHub Pages のサブパス配信用 (https://<user>.github.io/claude-workspace/pocket-llm/)
export default defineConfig({
  base: process.env.POCKET_LLM_BASE || '/claude-workspace/pocket-llm/',
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 6000,
  },
})
