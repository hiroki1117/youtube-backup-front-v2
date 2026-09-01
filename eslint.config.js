import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-config-prettier";

// ESLint flat config（team.md「ESLint 構成」準拠）。
// @eslint/js recommended + typescript-eslint + react-hooks + react-refresh
// + eslint-plugin-import（import/no-cycle でレイヤ逆流を機械的に禁止）
// + eslint-config-prettier（最後に適用して Formatter 競合を解消）。
export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules", "infra"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // TS がスコープ解決を担うため core no-undef は無効化（vitest globals 等）
      "no-undef": "off",
      // localStorage/matchMedia 等の防御的 try/catch で空 catch を許可
      "no-empty": ["error", { allowEmptyCatch: true }],

      // project.md Mandated / team.md Code Style
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      eqeqeq: ["error", "always"],

      // レイヤ一方向依存の機械的強制（team.md: 逆流を import/no-cycle で禁止）
      "import/no-cycle": ["error", { maxDepth: 10 }],
    },
  },
  // 設定ファイル・テストファイルは Node グローバルを許可
  {
    files: ["*.config.ts", "*.config.js", "src/test/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  // prettier は最後（team.md）
  prettier,
);
