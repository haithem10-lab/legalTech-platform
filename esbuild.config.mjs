import * as esbuild from "esbuild";
import { mkdir } from "node:fs/promises";

await mkdir("public", { recursive: true });

await esbuild.build({
  entryPoints: ["src/embed/embed.ts"],
  outfile: "public/embed.js",
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: ["es2017"],
  // Path aliases — mirror tsconfig @/ alias for the renderer import
  alias: {
    "@/lib/renderer": "./src/lib/renderer.ts",
    "@/types/workflow": "./src/types/workflow.ts",
  },
});

console.log("✓ public/embed.js built");
