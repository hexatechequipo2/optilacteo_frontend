import { useCallback, useEffect, useState } from "react";
import {
  configuracionNotificacionService,
  extraerMensajeError,
} from "../services/notificacion.service";
import type { ConfiguracionNotificacionNivel } from "../types/configuracionNotificacion.types";
import type { NivelAlerta } from "../types/notificacion.types";
import type { RolType } from "../types/rol.types";
import type { UsuarioType } from "../types/usuario.types";

interface UseConfiguracionAlertasResult {
  configuraciones: ConfiguracionNotificacionNivel[];
  isLoading: boolean;
  error: string | null;
  // Cada acción persiste al toque contra la API — no hay endpoint de
  // guardado en lote en el backend (solo POST/DELETE por fila).
  // Reciben el RolType/UsuarioType completo (no solo el id): el POST del
  // backend devuelve la fila creada sin la relación `rol`/`usuario`
  // hidratada (solo el GET la trae con relations cargadas), así que la
  // completamos acá con el dato ya conocido en pantalla.
  agregarRol: (nivelAlerta: NivelAlerta, rol: RolType) => Promise<void>;
  agregarUsuario: (nivelAlerta: NivelAlerta, usuario: UsuarioType) => Promise<void>;
  quitarDestinatario: (id: number) => Promise<void>;
}

// HU-26/HU-29: destinatarios de alertas por nivel, contra el back real
// (GET/POST/DELETE /notificaciones/configuracion). Cada fila es un rol
// completo (rolId) o un usuario puntual (usuarioId) — nunca ambos ni
// ninguno (constraint XOR del backend).
export function useConfiguracionAlertas(): UseConfiguracionAlertasResult {
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionNotificacionNivel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const data = await configuracionNotificacionService.getAll();
        if (!cancelado) setConfiguraciones(data);
      } catch (err) {
        if (!cancelado) {
          setError(extraerMensajeError(err, "No se pudo cargar la configuración de alertas."));
        }
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  const agregarRol = useCallback(async (nivelAlerta: NivelAlerta, rol: RolType) => {
    setError(null);
    try {
      const creada = await configuracionNotificacionService.create({
        nivelAlerta,
        rolId: rol.id,
      });
      // creada.rol viene undefined (ver comentario en la firma más arriba)
      // — sin este fallback, NivelDestinatariosCard revienta al leer
      // c.rol.nombre apenas se agrega una fila nueva.
      const configuracionHidratada: ConfiguracionNotificacionNivel = {
        ...creada,
        rol: creada.rol ?? { id: rol.id, nombre: rol.nombre },
      };
      setConfiguraciones((prev) => [...prev, configuracionHidratada]);
    } catch (err) {
      setError(extraerMensajeError(err, "No se pudo agregar el destinatario."));
      throw err;
    }
  }, []);

  const agregarUsuario = useCallback(async (nivelAlerta: NivelAlerta, usuario: UsuarioType) => {
    setError(null);
    try {
      const creada = await configuracionNotificacionService.create({
        nivelAlerta,
        usuarioId: usuario.id,
      });
      // Mismo motivo que en agregarRol: hidratamos con lo que ya tenemos
      // en pantalla porque el POST no devuelve la relación cargada.
      const configuracionHidratada: ConfiguracionNotificacionNivel = {
        ...creada,
        usuario: creada.usuario ?? { id: usuario.id, name: usuario.name, email: usuario.email },
      };
      setConfiguraciones((prev) => [...prev, configuracionHidratada]);
    } catch (err) {
      setError(extraerMensajeError(err, "No se pudo agregar el destinatario."));
      throw err;
    }
  }, []);

  const quitarDestinatario = useCallback(async (id: number) => {
    setError(null);
    // Optimista: la card no debería tildarse esperando la respuesta. Si el
    // DELETE falla (por ejemplo, es el último destinatario de CRITICA y el
    // backend lo bloquea con 400), se reinserta la fila que se sacó.
    let eliminado: ConfiguracionNotificacionNivel | undefined;
    setConfiguraciones((prev) => {
      eliminado = prev.find((c) => c.id === id);
      return prev.filter((c) => c.id !== id);
    });
    try {
      await configuracionNotificacionService.remove(id);
    } catch (err) {
      if (eliminado) {
        setConfiguraciones((prev) => [...prev, eliminado!]);
      }
      setError(extraerMensajeError(err, "No se pudo quitar el destinatario."));
      throw err;
    }
  }, []);

  return { configuraciones, isLoading, error, agregarRol, agregarUsuario, quitarDestinatario };
}
