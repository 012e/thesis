/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'

const ext = {
  cjs: 'cjs',
  es: 'js',
} as const

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8')) as {
  dependencies: Record<string, string>
  peerDependencies: Record<string, string>
}

const externalPackages = [
  ...Object.keys(packageJson.dependencies),
  ...Object.keys(packageJson.peerDependencies),
  /@lexical\/react\/.*/,
  'react/jsx-runtime',
  'react/jsx-dev-runtime'
]

export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'classic' } as const),
    dts({
      rollupTypes: true,
      staticImport: true,
      compilerOptions: {
        skipLibCheck: true,
      },
    }),
    svgr({
      svgrOptions: {
        svgo: true,
        replaceAttrValues: { 'black': 'currentColor' }
      }
    }),
    tsconfigPaths()
  ],
  build: {
    minify: 'terser',
    cssMinify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: (format, entryName) => {
        return `${entryName}.${ext[format as 'cjs' | 'es']}`
      },
    },
    rollupOptions: {
      output: {
        exports: 'named',
        preserveModules: true,
        preserveModulesRoot: 'src'
      },
      external: externalPackages,
    },
  },
  css: {
    modules: {
      scopeBehaviour: 'local',
      localsConvention: 'camelCaseOnly'
    }
  }
})
