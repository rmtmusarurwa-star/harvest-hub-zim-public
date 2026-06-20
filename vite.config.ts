import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Standalone Vite config. This project previously generated its config via
// @lovable.dev/vite-tanstack-config; this file recreates the same plugin set
// directly so the app builds and deploys independently of Lovable:
//   - tailwindcss, tsConfigPaths, tanstackStart (with the `server.ts` SSR
//     error-wrapper entry), viteReact, "@" path alias, React/TanStack dedupe,
//     VITE_* env injection, and the Cloudflare Worker build via nitro's
//     cloudflare-module preset (what wrangler.jsonc's `main: src/server.ts`
//     expects to find in dist/server after `vite build`).
export default defineConfig(({ command, mode }) => {
  // Mirrors Vite's built-in VITE_*-prefixed client env injection, but defined
  // explicitly so server-side (SSR) code sees the same import.meta.env.* values.
  const define: Record<string, string> = {};
  const env = loadEnv(mode, process.cwd(), "VITE_");
  for (const [key, value] of Object.entries(env)) {
    define[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define,
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    server: {
      host: "::",
      port: 8080,
      watch: {
        awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
      },
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
      }),
      // Only needed when producing the deployable build — builds the
      // Cloudflare Worker bundle (dist/server + dist/client) wrangler.jsonc expects.
      command === "build" &&
        nitro({
          preset: process.env.NITRO_PRESET ?? "cloudflare-module",
          output: {
            dir: "dist",
            serverDir: "dist/server",
            publicDir: "dist/client",
          },
          cloudflare: { nodeCompat: true, deployConfig: true },
        }),
      viteReact(),
    ],
  };
});
