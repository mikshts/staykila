import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// react-refresh's export shape differs across versions:
//  - v0.4.x exposes `configs.vite`
//  - newer versions expose `configs['recommended']` or a flat config directly.
// Resolve defensively so `eslint .` never crashes on an undefined path.
function reactRefreshConfig() {
  if (reactRefresh?.configs?.vite) return reactRefresh.configs.vite
  if (reactRefresh?.configs?.recommended) return reactRefresh.configs.recommended
  // Fallback: if the plugin ships a flat config object directly, use it.
  if (reactRefresh && !Array.isArray(reactRefresh) && reactRefresh.languageOptions) {
    return reactRefresh
  }
  return {}
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat?.recommended ?? reactHooks.configs.recommended,
      reactRefreshConfig(),
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
