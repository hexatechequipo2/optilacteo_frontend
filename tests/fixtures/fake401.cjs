// Verifica que la suite no dependa del backend real (npm run test:sin-backend).
//
// Levanta en el 3000 un server que responde 401 a todo — lo que vería un spec
// que se escapa al backend real con el token fake de loginAs() — y corre la
// suite completa contra él. Los builds de test apuntan la API a otro puerto
// (tests/fixtures/backendDeTest.ts), así que el resultado tiene que ser el
// mismo que sin backend. Argumentos extra van a `playwright test`.
const http = require("node:http");
const { spawn } = require("node:child_process");

const PUERTO = 3000;

const server = http.createServer((req, res) => {
  res.writeHead(401, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "*",
  });
  res.end(req.method === "OPTIONS" ? "" : JSON.stringify({ message: "Unauthorized" }));
});

server.on("error", (err) => {
  console.error(
    err.code === "EADDRINUSE"
      ? `El puerto ${PUERTO} está ocupado (¿backend real corriendo?). Bajalo y volvé a correr.`
      : err,
  );
  process.exit(1);
});

server.listen(PUERTO, () => {
  console.log(`Backend falso (401 a todo) escuchando en el ${PUERTO}`);
  const playwright = spawn("npx", ["playwright", "test", ...process.argv.slice(2)], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  playwright.on("exit", (code) => {
    server.close();
    process.exit(code ?? 1);
  });
});
