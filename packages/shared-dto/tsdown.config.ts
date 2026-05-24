import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["index.ts"],
  format: ["cjs", "esm"],
  dts: {
    enabled: true,
    tsgo: { enabled: true },
  },
  clean: true,
  sourcemap: true,
  outDir: "dist",
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
  target: false,
});
