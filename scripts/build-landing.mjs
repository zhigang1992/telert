// Precompiles the landing page (src/landing/app.tsx) and inlines it into src/index.html.
// Run `pnpm build:landing` after editing src/landing/*; src/index.html is committed because
// `wrangler deploy` does not run a build step.
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

const result = await build({
  entryPoints: ["src/landing/app.tsx"],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "transform",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const template = readFileSync("src/landing/template.html", "utf8");
writeFileSync("src/index.html", template.replace("/*__APP__*/", () => js));
console.log(`src/index.html written (${(js.length / 1024).toFixed(0)} KiB of JS)`);
