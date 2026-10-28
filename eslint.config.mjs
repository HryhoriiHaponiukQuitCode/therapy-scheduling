import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  // Без довгого тире «—» у текстах інтерфейсу: рядки, шаблони й JSX у src/ (у коментарях можна).
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...["Literal[value=/—/]", "TemplateElement[value.raw=/—/]", "JSXText[value=/—/]"].map((selector) => ({
          selector,
          message: "No em dash (—) in UI text: use a comma, colon, period or plain words.",
        })),
      ],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Дані для тестів скриптів (навмисно «зламані» файли).
    "tests/fixtures/**",
  ]),
]);

export default eslintConfig;
