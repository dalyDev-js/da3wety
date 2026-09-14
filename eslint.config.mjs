import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "framer-motion",
              message: "Import from 'motion/react' instead; framer-motion is the internal engine.",
            },
            {
              name: "zod/v3",
              message: "Use 'zod' (v4). Do not mix zod/v3 schemas.",
            },
            {
              name: "zod/mini",
              message: "Use 'zod'; the mini API is not a drop-in replacement.",
            },
          ],
        },
      ],
    },
  },
  {
    // Server-only modules must never be pulled into client components.
    files: ["src/components/**/*.tsx", "src/app/**/*.tsx"],
    rules: {},
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/wasm/**",
    "drizzle/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
