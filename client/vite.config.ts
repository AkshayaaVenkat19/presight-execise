/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";
import { resolve } from "path";
import { loadEnv } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default ({ mode }: { mode: string }) => {
  const env = loadEnv(mode, __dirname, ["API_BASE_URL", "VITE_API_URL"]);
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // Proxy /api calls to the backend during development
        "/api": {
          target:
            env.API_BASE_URL || env.VITE_API_URL || "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/setupTests.ts"],
      globals: true,
    },
  };
};
