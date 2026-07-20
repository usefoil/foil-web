import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      ".git/**",
      ".worktrees/**",
      "dist/**",
      "marketing/**",
      "node_modules/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["*.js"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["scripts/**/*.mjs", "*.config.mjs"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "no-console": "off",
    },
  },
];
