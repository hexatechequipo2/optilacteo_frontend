import { test, expect } from "./fixtures/coverageFixtures.ts";
import { loginAsAdministrador, mockPermisos } from "./fixtures/mockAuth.ts";

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
    await mockPermisos(page, "Administrador");
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

// ---------------------------------------------------------------------------
// Interceptor de refresh de token (api.ts) — ningún otro spec dispara nunca
// un 401 en un request YA autenticado (loginAsAdministrador solo mockea el
// refresh "silencioso" post-goto, no la reacción a un 401 real), así que
// refreshAccessToken() y el retry automático quedaban sin cubrir.
// ---------------------------------------------------------------------------

async function mockCatchAllYNotificaciones(page: Parameters<typeof loginAsAdministrador>[0]) {
  await page.route("**/*", async (route) => {
    const rt = route.request().resourceType();
    if (rt === "xhr" || rt === "fetch") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    return route.continue();
  });

  // Sin esto, Layout crashea (notificaciones.filter sobre undefined) al
  // llegar a /dashboard con el catch-all genérico devolviendo un array
  // plano en vez de {data, meta} — ver mismo fix en planes.spec.ts.
  await page.route("**/notificacion*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
    });
  });

  // Sin esto, FloatingDictadoVozButton (Layout) crashea: loteService.getAll()
  // hace return data.data y el catch-all devuelve [] → data.data = undefined.
  await page.route("**/lotes*", async (route) => {
    const rt = route.request().resourceType();
    if (rt !== "fetch" && rt !== "xhr") return route.continue();
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [],
        meta: { page: 1, limit: 100, total: 0, totalPages: 1 },
      }),
    });
  });
}

test.describe("Interceptor de refresh de token (401)", () => {
  test("un 401 en un request dispara un refresh automático y reintenta con el token nuevo", async ({ page }) => {
    await mockCatchAllYNotificaciones(page);

    // "armed" evita que el 401 lo dispare, sin que lo controlemos, el
    // fetch de contadores que hace el Sidebar apenas aterriza en
    // /dashboard durante el login — recién se activa antes del goto a
    // /empresas, que es el request que queremos ver reintentado.
    let armed = false;
    let empresaCalls = 0;
    await page.route("**/empresa*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      if (!armed) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
        });
      }
      empresaCalls++;
      if (empresaCalls === 1) {
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ message: "Token expirado" }),
        });
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [{ id: 1, name: "Tambo San José", cuit: "30-12345678-9", plan: "pro", isActive: true }],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }),
      });
    });

    await loginAsAdministrador(page);
    armed = true;
    await page.goto("/empresas");

    // Sin el interceptor, ese 401 hubiese cerrado la sesión — en cambio la
    // lista carga normal porque refreshAccessToken() + api(originalRequest)
    // reintentaron solos, sin que el usuario note nada.
    await expect(page.getByText("Tambo San José").first()).toBeVisible();
    expect(empresaCalls).toBeGreaterThanOrEqual(2);
  });

  test("si el refresh también falla con 401, cierra la sesión y redirige a /login", async ({ page }) => {
    await mockCatchAllYNotificaciones(page);

    let armed = false;
    await page.route("**/empresa*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.continue();
      if (route.request().method() !== "GET") return route.continue();
      if (!armed) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
        });
      }
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Token expirado" }),
      });
    });

    await loginAsAdministrador(page);

    // Pisa el mock de /refresh que registra loginAsAdministrador (siempre
    // 200): acá el refresh token guardado también está vencido/inválido.
    await page.route("**/refresh", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Refresh token inválido" }),
      });
    });
    armed = true;

    await page.goto("/empresas");

    // clearSession() + redirectToLogin() — recarga dura a /login.
    await expect(page).toHaveURL("/login");
  });
});
// ---------------------------------------------------------------------------
// Sesión y refresh de token: casos de borde del interceptor y de AuthContext
// ---------------------------------------------------------------------------

test.describe("Interceptor de refresh de token (401) › Casos de borde", () => {
  test("varios 401 simultáneos comparten un único refresh y todos se reintentan con el token nuevo", async ({ page }) => {
    await mockCatchAllYNotificaciones(page);
    await loginAsAdministrador(page);
    // Se sale del dashboard (sigue pidiendo contadores) a una pantalla quieta.
    await page.goto("/planes");
    await expect(page.getByRole("heading", { name: "Planes" })).toBeVisible();

    // Desde acá: la restauración de sesión del goto recibe un token que el
    // back ya considera vencido; el siguiente refresh entrega uno válido.
    let refreshes = 0;
    await page.route("**/refresh", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      refreshes++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: refreshes === 1 ? "token-vencido" : "token-nuevo",
          refresh_token: `refresh-${refreshes}`,
        }),
      });
    });
    const reintentos: string[] = [];
    let rechazos = 0;
    await page.route(/\/(empresa|user|planes|proveedores)(\?|$)/, async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.fallback();
      const auth = route.request().headers()["authorization"];
      if (auth === "Bearer token-vencido") {
        rechazos++;
        return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Token expirado" }) });
      }
      reintentos.push(`${new URL(route.request().url()).pathname} ${auth}`);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
      });
    });

    await page.goto("/empresas");

    // La pantalla y los contadores del menú piden varias cosas a la vez.
    await expect.poll(() => reintentos.length).toBeGreaterThanOrEqual(3);
    expect(rechazos).toBeGreaterThanOrEqual(3);
    expect(refreshes).toBe(2); // restauración de sesión + un único refresh compartido
    expect(reintentos.every((r) => r.endsWith("Bearer token-nuevo"))).toBe(true);
    await expect(page).toHaveURL("/empresas");
    // El refresh token rotado queda guardado donde estaba.
    expect(await page.evaluate(() => sessionStorage.getItem("refreshToken"))).toBe("refresh-2");
  });

  test("un 401 sin refresh token guardado cierra la sesión", async ({ page }) => {
    await mockCatchAllYNotificaciones(page);
    await loginAsAdministrador(page);
    await page.goto("/planes");
    await expect(page.getByRole("heading", { name: "Planes" })).toBeVisible();
    // Solo el listado de la pantalla Empresas (limit=5) responde 401; los
    // contadores del menú (limit=1) siguen normales para no adelantarse.
    await page.route("**/empresa*", async (route) => {
      const rt = route.request().resourceType();
      if (rt !== "fetch" && rt !== "xhr") return route.fallback();
      if (new URL(route.request().url()).searchParams.get("limit") !== "5") return route.fallback();
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Token expirado" }) });
    });
    await page.evaluate(() => {
      sessionStorage.removeItem("refreshToken");
      localStorage.removeItem("refreshToken");
    });

    // Navegación dentro de la SPA: el token en memoria sigue, pero no hay con qué refrescarlo.
    await page.getByRole("complementary").getByRole("button", { name: /^Empresas/ }).click();

    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("button", { name: "Ingresar a la consola" })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("usuario"))).toBeNull();
  });
});

test.describe("AuthContext › Sesión", () => {
  test("sin sesión, una ruta protegida lleva al login", async ({ page }) => {
    await mockCatchAllYNotificaciones(page);

    await page.goto("/lotes");

    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("button", { name: "Ingresar a la consola" })).toBeVisible();
  });

  async function loginConRecordarme(page: import("@playwright/test").Page, recordarme: boolean) {
    await mockCatchAllYNotificaciones(page);
    await mockPermisos(page, "Administrador");
    await page.route("**/login", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "fake-token",
          refresh_token: "refresh-recordado",
          user: { id: 1, email: "admin@optilacteo.com", rolNombre: "Administrador" },
        }),
      });
    });
    await page.goto("/login");
    await page.getByLabel("Correo corporativo").fill("admin@optilacteo.com");
    await page.locator("#password").fill("password123");
    if (recordarme) await page.getByLabel("Recordarme").check();
    await page.getByRole("button", { name: "Ingresar a la consola" }).click();
    await expect(page).toHaveURL("/dashboard");
  }

  async function abrirOtraPestana(page: import("@playwright/test").Page) {
    const otra = await page.context().newPage();
    await mockCatchAllYNotificaciones(otra);
    await mockPermisos(otra, "Administrador");
    await otra.route("**/refresh", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ access_token: "fake-token-2", refresh_token: "refresh-rotado" }),
          })
        : route.fallback(),
    );
    await otra.goto("/planes");
    return otra;
  }

  test("con 'Recordarme' la sesión sigue abierta en otra pestaña", async ({ page }) => {
    await loginConRecordarme(page, true);
    expect(await page.evaluate(() => localStorage.getItem("refreshToken"))).toBe("refresh-recordado");

    const otra = await abrirOtraPestana(page);

    await expect(otra).toHaveURL("/planes");
    await expect(otra.getByRole("heading", { name: "Planes" })).toBeVisible();
    // El refresh rotado se reescribe en el mismo storage.
    expect(await otra.evaluate(() => localStorage.getItem("refreshToken"))).toBe("refresh-rotado");
  });

  test("sin 'Recordarme' la sesión no pasa a otra pestaña", async ({ page }) => {
    await loginConRecordarme(page, false);
    expect(await page.evaluate(() => localStorage.getItem("refreshToken"))).toBeNull();

    const otra = await abrirOtraPestana(page);

    await expect(otra).toHaveURL("/login");
  });

  test("si el servidor falla al cerrar sesión igual limpia la sesión local", async ({ page }) => {
    await mockCatchAllYNotificaciones(page);
    await page.route("**/logout", (route) => route.fulfill({ status: 500, body: "" }));
    await loginAsAdministrador(page);
    await page.goto("/planes");
    await expect(page.getByRole("heading", { name: "Planes" })).toBeVisible();

    await page.getByRole("button", { name: "Cerrar sesión" }).first().click();

    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("button", { name: "Ingresar a la consola" })).toBeVisible();
    expect(
      await page.evaluate(() => [localStorage.getItem("usuario"), sessionStorage.getItem("refreshToken")]),
    ).toEqual([null, null]);
  });
});
