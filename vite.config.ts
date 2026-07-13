import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import istanbul from 'vite-plugin-istanbul'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Solo instrumenta el código para cobertura cuando se buildea con
    // COVERAGE=true (ver playwright.coverage.config.ts). El build/dev
    // normal no se ve afectado.
    istanbul({
      include: 'src/**/*',
      exclude: ['node_modules', 'tests/'],
      extension: ['.ts', '.tsx'],
      requireEnv: true,
      forceBuildInstrument: true, // el plugin por default solo instrumenta en "dev"; nosotros usamos build+preview
    }),
  ],
})