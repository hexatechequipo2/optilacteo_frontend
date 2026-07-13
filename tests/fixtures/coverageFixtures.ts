import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { fileURLToPath } from "url";
import { test as baseTest, type Page } from "@playwright/test";

/**
 * Basado en el approach de mxschmitt/playwright-test-coverage: en vez de
 * usar page.coverage (V8, solo Chromium, difícil de mapear a líneas de
 * código fuente), el build se instrumenta con vite-plugin-istanbul y acá
 * simplemente recolectamos el objeto window.__coverage__ que esa
 * instrumentación va dejando en cada página, antes de que se descargue.
 *
 * Importa `test`/`expect` de ESTE archivo en vez de "@playwright/test" en
 * los specs que quieras incluir en el reporte de cobertura.
 */

const filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(filename);
const istanbulCLIOutput = path.join(__dirname, "..", "..", ".nyc_output");

function generateUUID(): string {
  return crypto.randomBytes(16).toString("hex");
}

async function collectPageCoverage(page: Page) {
  const coverageJSON = await page
    .evaluate(() => JSON.stringify((globalThis as any).__coverage__))
    .catch((err) => {
      console.log(`🟡 [coverage] evaluate falló en ${page.url()}:`, err.message);
      return null;
    });

  console.log(
    `🟡 [coverage] ${page.url()} -> ${coverageJSON ? `${coverageJSON.length} chars` : "sin datos"}`,
  );

  if (coverageJSON && coverageJSON !== "undefined") {
    await fs.promises.mkdir(istanbulCLIOutput, { recursive: true });
    fs.writeFileSync(
      path.join(istanbulCLIOutput, `playwright_coverage_${generateUUID()}.json`),
      coverageJSON,
    );
  }
}

export const test = baseTest.extend({
  context: async ({ context }, use) => {
    await use(context);
    // Al terminar el test, recolectamos la cobertura acumulada de cada
    // página que haya quedado abierta en este contexto.
    for (const page of context.pages()) {
      await collectPageCoverage(page);
    }
  },
});

export const expect = test.expect;
export type { Page } from "@playwright/test";