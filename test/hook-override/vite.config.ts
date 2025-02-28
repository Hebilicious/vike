import react from '@vitejs/plugin-react'
import ssr from 'vike/plugin'
import type { UserConfig } from 'vite'

export default {
  plugins: [
    react(),
    ssr({
      redirects: {
        '/permanent-redirect': '/'
      }
    })
  ]
} satisfies UserConfig
