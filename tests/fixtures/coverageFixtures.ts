import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { fileURLToPath } from "url";
import { test as baseTest, type Page } from "@playwright/test";

/**
 * Basado en el approach de mxschmitt/playwright-test-coverage: en vez de
 * usar page.coverage (V8, solo Chromium, difícil de mapear a líneas de
 * código fuente), el build se instrumenta con vite-plugin-istanbul y acá
 * recolectamos el objeto window.__coverage__ que esa instrumentación va
 * dejando en cada documento.
 *
 * Solo actúa con la opción `collectCoverage: true`, que activa
 * playwright.coverage.config.ts. En la suite normal es un passthrough.
 *
 * Importa `test`/`expect` de ESTE archivo en vez de "@playwright/test" en
 * los specs.
 */

const filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(filename);
const istanbulCLIOutput = path.join(__dirname, "..", "..", ".nyc_output");

function writeCoverage(coverageJSON: string) {
  fs.mkdirSync(istanbulCLIOutput, { recursive: true });
  fs.writeFileSync(
    path.join(istanbulCLIOutput, `playwright_coverage_${crypto.randomBytes(16).toString("hex")}.json`),
    coverageJSON,
  );
}

async function readPageCoverage(page: Page): Promise<string | null> {
  // Un test puede terminar apenas commitea una navegación (ej. toHaveURL
  // tras el redirect duro a /login del interceptor de 401), antes de que el
  // bundle del documento nuevo ejecute y defina __coverage__.
  await page.waitForLoadState("load").catch(() => {});
  const coverageJSON = await page
    .evaluate(() => {
      const coverage = (globalThis as { __coverage__?: unknown }).__coverage__;
      return coverage ? JSON.stringify(coverage) : null;
    })
    .catch(() => null);
  return coverageJSON;
}

export type CoverageOptions = { collectCoverage: boolean };

export const test = baseTest.extend<CoverageOptions>({
  collectCoverage: [false, { option: true }],

  context: async ({ context, collectCoverage, baseURL }, use, testInfo) => {
    if (!collectCoverage) {
      await use(context);
      return;
    }

    const appOrigin = new URL(baseURL!).origin;
    let flushedDocs = 0;
    let closing = false;

    // Cada page.goto()/reload/redirect por window.location es una carga
    // nueva que reinicia window.__coverage__. Antes de que el documento se
    // descargue, el init script manda su cobertura acá por un binding (el
    // mensaje sale por CDP en el mismo pagehide, así que llega aunque el
    // documento ya no exista cuando se procesa).
    await context.exposeBinding("__flushCoverage__", (_source, coverageJSON: string) => {
      if (closing) return; // el documento final ya se recolecta abajo
      writeCoverage(coverageJSON);
      flushedDocs++;
    });
    await context.addInitScript(() => {
      window.addEventListener("pagehide", () => {
        const coverage = (globalThis as { __coverage__?: unknown }).__coverage__;
        const flush = (globalThis as { __flushCoverage__?: (json: string) => void }).__flushCoverage__;
        if (coverage && flush) flush(JSON.stringify(coverage));
      });
    });

    await use(context);

    closing = true;
    let finalDocs = 0;
    const sinCobertura: string[] = [];
    for (const page of context.pages()) {
      const url = page.url();
      if (!url.startsWith(appOrigin)) continue; // about:blank, otros orígenes
      const coverageJSON = await readPageCoverage(page);
      if (coverageJSON) {
        writeCoverage(coverageJSON);
        finalDocs++;
      } else {
        sinCobertura.push(url);
      }
    }

    testInfo.annotations.push({
      type: "coverage",
      description: `${flushedDocs + finalDocs} documentos (${flushedDocs} en pagehide, ${finalDocs} al final)`,
    });

    if (sinCobertura.length > 0) {
      throw new Error(
        `[coverage] sin window.__coverage__ en ${sinCobertura.join(", ")}: ` +
          "¿el server corre sin VITE_COVERAGE=true?",
      );
    }
  },
});

export const expect = test.expect;
export type { Page } from "@playwright/test";
