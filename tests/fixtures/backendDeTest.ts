// Los builds que sirven a Playwright apuntan la API a un puerto donde no
// escucha nada. Así un backend real corriendo en el 3000 no cambia ningún
// resultado: lo que un spec no mockea (o deja pasar con route.continue())
// falla igual que con el backend apagado. Sin esto, el token fake de
// loginAs() recibía 401 del back real → refresh → redirect a /login a
// mitad de test (flakiness de empresas.spec, tambos, lotes...).
export const TEST_API_URL = "http://localhost:3999";
