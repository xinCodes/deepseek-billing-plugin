{
  "name": "developer-utility-extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.15.9",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "pnpm typecheck && vite build",
    "typecheck": "vue-tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "pinia": "^2.3.0",
    "vue": "^3.5.13",
    "vue-router": "^4.5.0",
    "webextension-polyfill": "^0.12.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.7",
    "@types/chrome": "^0.0.287",
    "@types/node": "^22.10.2",
    "@types/webextension-polyfill": "^0.12.3",
    "typescript": "^5.7.2",
    "vite": "^8.0.16",
    "vitest": "^4.1.8",
    "vue-tsc": "^3.3.4"
  }
}
