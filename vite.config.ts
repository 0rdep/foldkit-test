import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const serverProxy = {
  '/graphql': {
    target: 'https://bff-v2.testing.punct.co.il',
    changeOrigin: true,
    secure: true,
  },
}

export default defineConfig({
  plugins: [tailwindcss(), foldkit({ devToolsMcpPort: 9988 })],
  server:
    process.env.VITE_ALLOW_EXTERNAL_HOSTS === 'true'
      ? {
          allowedHosts: true,
          hmr: {
            protocol: 'wss',
            clientPort: 443,
          },
          proxy: serverProxy,
        }
      : { proxy: serverProxy },
  optimizeDeps: {
    entries: ['src/entry.ts'],
  },
})
