import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function netlifySpaRedirectPlugin() {
  return {
    name: 'netlify-spa-redirect',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '_redirects',
        source: '/* /index.html 200\n',
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    netlifySpaRedirectPlugin(),
  ],
})
