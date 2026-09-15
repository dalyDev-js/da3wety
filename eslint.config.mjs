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
    // Client components must never pull zod (≈390 KB) into the guest bundle.
    // Server components under src/app may still import schemas; the ui/ primitives
    // and shells never validate. Action state types live in lib/validation/state.
    files: ["src/components/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "framer-motion", message: "Import from 'motion/react' instead." },
            { name: "zod", message: "Do not import zod in components; validate in server actions." },
            { name: "zod/v3", message: "Do not import zod in components." },
            { name: "zod/mini", message: "Do not import zod in components." },
          ],
          patterns: [
            {
              group: ["@/lib/validation/*", "!@/lib/validation/state"],
              allowTypeImports: true,
              message:
                "Pulls zod into the client bundle. Import state types from '@/lib/validation/state' and phone helpers from '@/lib/phone'.",
            },
          ],
        },
      ],
    },
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
