// @ts-check
const eslint = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = defineConfig([
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
      // `_`-prefixed names and rest siblings mark values left out on purpose (`const { id: _, ...rest } = row`).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {
      // The shared/ui form controls (and PrimeNG inputs not wrapped yet) count as form controls inside a <label>.
      "@angular-eslint/template/label-has-associated-control": [
        "error",
        {
          controlComponents: [
            "app-multi-select",
            "app-password",
            "app-select",
            "app-toggle",
            "p-checkbox",
            "p-datepicker",
            "p-inputnumber",
            "p-multiselect",
            "p-password",
            "p-radiobutton",
            "p-select",
            "p-toggleswitch",
          ],
        },
      ],
    },
  },
]);
