import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  // Build VS Code extension (Node.js, CommonJS)
  if (mode === "extension") {
    return {
      build: {
        lib: {
          entry: "src/extension/extension.ts",
          formats: ["cjs"],
          fileName: () => "extension.js",
        },
        outDir: "dist",
        emptyOutDir: false,
        target: "node20",
        rollupOptions: {
          external: ["vscode", /^node:/],
        },
        sourcemap: process.env.NODE_ENV !== "production",
        minify: process.env.NODE_ENV === "production",
      },
      resolve: {
        // Ensure Node.js built-ins are not externalized for browser
        conditions: ["node"],
      },
    };
  }

  // Build webview React UI (browser)
  return {
    plugins: [react()],
    root: "src/webview",
    build: {
      outDir: "../../dist/webview",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]",
        },
      },
    },
  };
});
