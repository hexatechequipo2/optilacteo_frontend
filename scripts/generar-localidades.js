import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const archivo = path.join(__dirname, "../data/localidades_cp_maestro.xlsx");

const workbook = XLSX.readFile(archivo);

const sheet = workbook.Sheets[workbook.SheetNames[0]];

const datos = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
});

const resultado = {};

for (const fila of datos) {

    const provincia = fila.provincia?.trim();

    const localidad = fila.localidad?.trim();

    if (!provincia || !localidad)
        continue;

    if (!resultado[provincia]) {
        resultado[provincia] = new Set();
    }

    resultado[provincia].add(localidad);
}

for (const provincia in resultado) {

    resultado[provincia] =
        [...resultado[provincia]]
            .sort((a, b) => a.localeCompare(b, "es"));
}

const provinciasOrdenadas =
    Object.keys(resultado)
        .sort((a, b) => a.localeCompare(b, "es"));

const objetoFinal = {};

for (const provincia of provinciasOrdenadas) {

    objetoFinal[provincia] = resultado[provincia];
}

const contenido =
`/** Archivo generado automáticamente */

export const LOCALIDADES_POR_PROVINCIA = ${JSON.stringify(objetoFinal, null, 2)} as const;
`;

fs.writeFileSync(
    path.join(__dirname, "../src/data/localidades-argentina.ts"),
    contenido
);

console.log("Archivo generado correctamente.");
console.log("Provincias:", provinciasOrdenadas.length);
