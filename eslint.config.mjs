import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        files: ["src/*.{js,mjs,cjs}"],
        plugins: { js },
        extends: ["js/recommended"],
        languageOptions: {
            globals: { ...globals.nodeBuiltin },
        },
    },
    {
        files: ["src/preload.js"],
        languageOptions: {
            // Electron runs sandboxed preloads as CommonJS regardless of package type.
            sourceType: "commonjs",
        },
    },
]);
