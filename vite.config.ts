// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.


import fs from 'fs';
import path from 'path';
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
process.env.GROQ_API_KEY = env.GROQ_API_KEY;
// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  plugins: [
    {
      name: 'remove-wrangler-from-dist',
      closeBundle() {
        const filePath = path.resolve('dist/client/wrangler.json');
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('Removed dist/client/wrangler.json');
        }
      },
    },
  ],
});
