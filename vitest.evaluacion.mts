import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Corrida de la evaluación (no son pruebas unitarias): npm run evaluar
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/evaluacion/**/*.evaluacion.ts"] },
});
