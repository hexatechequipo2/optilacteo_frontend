import { test, expect } from "./fixtures/coverageFixtures.ts";

test.describe("LoginPage", () => {
  test("muestra errores de validación con campos vacíos", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Ingresar a la consola" }).click();

    await expect(page.getByText("El email es obligatorio")).toBeVisible();
    await expect(
      page.getByText("La contraseña es obligatoria"),
    ).toBeVisible();
  });

  test("muestra error de formato en email inválido", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo corporativo").fill("no-es-un-email");
    await page.locator("#password").fill("123456");
    await page.getByRole("button", { name: "Ingresar a la consola" }).click();

    await expect(page.getByText("El email no es válido")).toBeVisible();
  });

  test("login exitoso redirige a /dashboard", async ({ page }) => {
    await page.route("**/login", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "fake-token",
          refresh_token: "fake-refresh",
          user: { id: 1, email: "admin@optilacteo.com", rolNombre: "Administrador" },
        }),
      });
    });

    await page.goto("/login");
    await page.getByLabel("Correo corporativo").fill("admin@optilacteo.com");
    await page.locator("#password").fill("password123");
    await page.getByRole("button", { name: "Ingresar a la consola" }).click();

    await expect(page).toHaveURL("/dashboard");
  });

  test("credenciales incorrectas muestra mensaje genérico", async ({ page }) => {
    await page.route("**/login", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Credenciales inválidas" }),
      });
    });

    await page.goto("/login");
    await page.getByLabel("Correo corporativo").fill("admin@optilacteo.com");
    await page.locator("#password").fill("wrongpass");
    await page.getByRole("button", { name: "Ingresar a la consola" }).click();

    await expect(page.getByText("Email o contraseña incorrectos")).toBeVisible();
  });

  test("cuenta inactiva muestra mensaje específico", async ({ page }) => {
    await page.route("**/login", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Usuario inactivo" }),
      });
    });

    await page.goto("/login");
    await page.getByLabel("Correo corporativo").fill("admin@optilacteo.com");
    await page.locator("#password").fill("password123");
    await page.getByRole("button", { name: "Ingresar a la consola" }).click();

    await expect(
      page.getByText(/tu cuenta está inactiva/i),
    ).toBeVisible();
  });

  test("cuenta bloqueada muestra mensaje específico", async ({ page }) => {
    await page.route("**/login", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Cuenta bloqueada por intentos fallidos" }),
      });
    });

    await page.goto("/login");
    await page.getByLabel("Correo corporativo").fill("admin@optilacteo.com");
    await page.locator("#password").fill("password123");
    await page.getByRole("button", { name: "Ingresar a la consola" }).click();

    await expect(
      page.getByText(/tu cuenta está bloqueada temporalmente/i),
    ).toBeVisible();
  });

  test("error de red muestra mensaje de conexión", async ({ page }) => {
    await page.route("**/login", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.abort("failed");
    });

    await page.goto("/login");
    await page.getByLabel("Correo corporativo").fill("admin@optilacteo.com");
    await page.locator("#password").fill("password123");
    await page.getByRole("button", { name: "Ingresar a la consola" }).click();

    await expect(
      page.getByText(/no se pudo conectar con el servidor/i),
    ).toBeVisible();
  });

  test("toggle de mostrar/ocultar contraseña funciona", async ({ page }) => {
    await page.goto("/login");
    const passwordInput = page.locator("#password");
    await passwordInput.fill("secreto123");

    await expect(passwordInput).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Mostrar contraseña" }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("link a olvidé mi contraseña navega correctamente", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
    await expect(page).toHaveURL("/forgot-password");
  });
});

test.describe("ForgotPasswordPage", () => {
  test("valida email vacío o inválido", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByRole("button", { name: "Enviar link de recuperación" }).click();
    await expect(page.getByText("El correo es obligatorio")).toBeVisible();

    await page.getByLabel("Correo corporativo").fill("no-valido");
    await page.getByRole("button", { name: "Enviar link de recuperación" }).click();
    await expect(page.getByText("El correo no es válido")).toBeVisible();
  });

  test("solicitud exitosa muestra pantalla de confirmación", async ({ page }) => {
    await page.route("**/request-password-reset", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("/forgot-password");
    await page.getByLabel("Correo corporativo").fill("admin@optilacteo.com");
    await page.getByRole("button", { name: "Enviar link de recuperación" }).click();

    await expect(page.getByText("Revisá tu correo")).toBeVisible();
    await page.getByRole("link", { name: "Volver al login" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("error del servidor se muestra al usuario", async ({ page }) => {
    await page.route("**/request-password-reset", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "No existe una cuenta con ese correo" }),
      });
    });

    await page.goto("/forgot-password");
    await page.getByLabel("Correo corporativo").fill("noexiste@optilacteo.com");
    await page.getByRole("button", { name: "Enviar link de recuperación" }).click();

    await expect(
      page.getByText("No existe una cuenta con ese correo"),
    ).toBeVisible();
  });
});

test.describe("ResetPasswordPage", () => {
  test("sin token en la URL muestra link inválido", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByText("Link inválido o expirado")).toBeVisible();
    await page.getByRole("link", { name: "Solicitar nuevo link" }).click();
    await expect(page).toHaveURL("/forgot-password");
  });

  test("valida longitud mínima y coincidencia de contraseñas", async ({ page }) => {
    await page.goto("/reset-password?token=abc123");

    await page.getByLabel("Nueva contraseña").fill("1234567");
    await page.getByLabel("Confirmar contraseña").fill("1234567");
    await page.getByRole("button", { name: "Guardar nueva contraseña" }).click();
    await expect(
      page.getByText("La contraseña debe tener al menos 8 caracteres"),
    ).toBeVisible();

    await page.getByLabel("Nueva contraseña").fill("password123");
    await page.getByLabel("Confirmar contraseña").fill("password456");
    await page.getByRole("button", { name: "Guardar nueva contraseña" }).click();
    await expect(page.getByText("Las contraseñas no coinciden")).toBeVisible();
  });

  test("reset exitoso permite volver al login", async ({ page }) => {
    await page.route("**/reset-password", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("/reset-password?token=abc123");
    await page.getByLabel("Nueva contraseña").fill("password123");
    await page.getByLabel("Confirmar contraseña").fill("password123");
    await page.getByRole("button", { name: "Guardar nueva contraseña" }).click();

    await expect(
      page.getByText("¡Contraseña actualizada correctamente!"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Ir al login" }).click();
    await expect(page).toHaveURL("/login");
  });
});