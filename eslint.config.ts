import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/coverage/**", "custom_components/**/www/**", "examples/**/www/**", "external/**", "config/**", ".venv/**", "docs/reference/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      // Explicit any is refused. A justified exception needs a commented eslint-disable on the line.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
