import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: {
    cjsReexport: true,
    tsgo: {
      enabled: true,
    },
  },
  clean: true,
  sourcemap: false,
  outDir: "dist",
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
  target: false,
});
