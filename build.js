const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: {
      index: "index.js"
    },
    bundle: true,
    platform: "node",
    target: ["node20"], // Support Node.js 14 and above
    outdir: "dist",
    minify: true,
    external: ["hexo"], // hexo is usually provided by the environment
  })
  .catch(() => process.exit(1));
