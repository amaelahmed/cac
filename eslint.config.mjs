import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".wrangler/**",
    ".vercel/**",
    "out/**",
    "build/**",
    "scratch/**",
    "e2e_smoke_test*.js",
    "inspect_ui.js",
    "qa_verify.js",
    "screenshot.js",
    "test_404.js",
    "test-theme.mjs",
    "scripts/evaluation/**",
    "patch_details.js",
    "rewrite_admin.js",
    "rewrite_grid.js",
    "scripts/build_industry.js",
    "test_viewport.js",
    "functions/api/utils/kb_seed.js",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
