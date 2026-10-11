import type { Page, Route } from "@playwright/test";

/**
 * Servidor socket.io falso sobre page.route (sin backend).
 *
 * socket.io-client arranca por long-polling HTTP (Engine.IO v4): un GET de
 * handshake, POSTs con los paquetes del cliente y GETs que quedan colgados
 * hasta que el servidor tiene algo para mandar. Acá se emula eso:
 *   - el handshake responde `upgrades: []`, así el cliente nunca intenta
 *     pasar a WebSocket y todo viaja por estas rutas;
 *   - cada `40/<namespace>` del cliente se confirma, y desde ahí el
 *     namespace cuenta como conectado;
 *   - emitir() encola un evento y libera el GET pendiente.
 *
 * Registrarlo DESPUÉS del catch-all del spec (page.route es LIFO), si no el
 * catch-all responde "[]" y el socket nunca conecta.
 */

const SEPARADOR = "\x1e"; // separa paquetes dentro de un mismo payload de polling

export interface SocketIoMock {
  /** Encola `42<ns>,["evento", data]` para los clientes conectados al namespace. */
  emitir(namespace: string, evento: string, data: unknown): void;
  /** El servidor desconecta el namespace (el cliente no reintenta solo). */
  desconectarNamespace(namespace: string): void;
  /** Corta el transporte (como una caída de red): el cliente reconecta solo. */
  cortarConexion(): void;
  /** Namespaces con conexión confirmada en la sesión Engine.IO actual. */
  conectados(): string[];
  /** Cantidad de handshakes Engine.IO recibidos (1 + reconexiones). */
  handshakes(): number;
}

export async function mockSocketIo(page: Page): Promise<SocketIoMock> {
  let sidActual = "";
  let handshakes = 0;
  let cola: string[] = [];
  let conectados = new Set<string>();
  let despertar: (() => void) | null = null;

  const encolar = (paquete: string) => {
    cola.push(paquete);
    despertar?.();
    despertar = null;
  };

  const responder = (route: Route, body: string) =>
    route
      .fulfill({ status: 200, contentType: "text/plain; charset=UTF-8", body })
      // El test puede terminar con un GET todavía colgado.
      .catch(() => {});

  // "40" = connect al namespace raíz; "40/sensores," o "40/sensores,{...}" = otro namespace.
  const namespaceDe = (paquete: string) => {
    const resto = paquete.slice(2);
    return resto.startsWith("/") ? resto.split(",")[0] : "/";
  };
  const prefijo = (namespace: string) => (namespace === "/" ? "" : `${namespace},`);

  await page.route(/\/socket\.io\/\?/, async (route) => {
    const request = route.request();
    const sid = new URL(request.url()).searchParams.get("sid");

    if (request.method() === "GET" && !sid) {
      handshakes++;
      sidActual = `sid-${handshakes}`;
      cola = [];
      conectados = new Set();
      return responder(
        route,
        "0" +
          JSON.stringify({
            sid: sidActual,
            upgrades: [],
            pingInterval: 25000,
            pingTimeout: 60000,
            maxPayload: 1000000,
          }),
      );
    }

    // Long-poll o POST de una sesión vieja (anterior a una reconexión).
    if (sid !== sidActual) return responder(route, request.method() === "POST" ? "ok" : "1");

    if (request.method() === "POST") {
      for (const paquete of (request.postData() ?? "").split(SEPARADOR)) {
        if (paquete.startsWith("40")) {
          const ns = namespaceDe(paquete);
          conectados.add(ns);
          encolar(`40${prefijo(ns)}${JSON.stringify({ sid: `${ns}-${handshakes}` })}`);
        } else if (paquete.startsWith("41")) {
          conectados.delete(namespaceDe(paquete));
        }
        // "3" (pong) y el resto no necesitan respuesta.
      }
      return responder(route, "ok");
    }

    // GET de long-polling: responde lo encolado o espera a que haya algo.
    if (cola.length === 0) {
      await new Promise<void>((resolve) => {
        despertar = resolve;
      });
    }
    const payload = cola.join(SEPARADOR);
    cola = [];
    return responder(route, payload);
  });

  return {
    emitir(namespace, evento, data) {
      encolar(`42${prefijo(namespace)}${JSON.stringify([evento, data])}`);
    },
    desconectarNamespace(namespace) {
      conectados.delete(namespace);
      encolar(`41${prefijo(namespace)}`);
    },
    cortarConexion() {
      // Paquete Engine.IO "close": el cliente cierra el transporte y
      // reintenta con un handshake nuevo.
      sidActual = "";
      encolar("1");
    },
    conectados: () => [...conectados],
    handshakes: () => handshakes,
  };
}
