import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/whoop-mg-platform/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "WHOOP MG Lab",
        short_name: "WHOOP MG Lab",
        description: "Personal Performance Intelligence",
        theme_color: "#0a0d12",
        background_color: "#0a0d12",
        display: "standalone",
        start_url: "/whoop-mg-platform/",
        icons: [
          {
            src: "/whoop-mg-platform/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: { navigateFallback: "/whoop-mg-platform/index.html" },
    }),
  ],
});
