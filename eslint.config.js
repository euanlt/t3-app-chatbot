import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default tseslint.config(
  {
    ignores: [
      ".next",
      "node_modules",
      ".vercel",
      "scripts/**/*",
      "**/*.js",
      "**/*.mjs",
      "**/*.cjs",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
      // Type-aware linting disabled due to performance issues in WSL
      // Re-enable when performance is fixed
    ],
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      // Disabled due to requiring type information
      // "@typescript-eslint/no-misused-promises": [
      //   "error",
      //   { checksVoidReturn: { attributes: false } },
      // ],
    },
  },
);
