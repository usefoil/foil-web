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
    files: ["*.js", "site.js"],
    languageOptions: { globals: globals.browser },
    rules: {
      "max-lines": [
        "error",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    files: ["scripts/**/*.mjs", "*.config.mjs"],
    languageOptions: { globals: globals.node },
    rules: {
      "max-lines": [
        "error",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      "no-console": "off",
    },
  },
];
