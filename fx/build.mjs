// Bundles fx/src/main.jsx (GSAP + Lenis + React Bits + React) into vendor/qareeb-fx.js and vendor/qareeb-fx.css.
// Run:  cd fx && npm install && npm run build      (then commit the two files in /vendor)
import { build } from "esbuild";

await build({
  entryPoints: ["src/main.jsx"],
  outfile: "../vendor/qareeb-fx.js",
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2019", "chrome80", "safari13"],
  jsx: "automatic",
  loader: { ".jsx": "jsx", ".css": "css" },
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
  logLevel: "info"
});
