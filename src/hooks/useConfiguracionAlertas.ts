import { useCallback, useEffect, useState } from "react";
import {
  configuracionNotificacionService,
  extraerMensajeError,
} from "../services/notificacion.service";
import type { ConfiguracionNotificacionNivel } from "../types/configuracionNotificacion.types";
import type { NivelAlerta } from "../types/notificacion.types";
import type { RolType } from "../types/rol.types";

interface UseConfiguracionAlertasResult {
  configuraciones: ConfiguracionNotificacionNivel[];
  isLoading: boolean;
  error: string | null;
  // Cada acción persiste al toque contra la API — no hay endpoint de
  // guardado en lote en el backend (HU-26 solo expone POST/DELETE por fila).
  // Recibe el RolType completo (no solo el id): el POST del backend
  // devuelve la fila creada con `rolId` pero sin la relación `rol`
  // hidratada (solo el GET la trae con `relations: { rol: true }`), así
  // que la completamos acá con el rol ya conocido en pantalla.
  agregarRol: (nivelAlerta: NivelAlerta, rol: RolType) => Promise<void>;
  quitarRol: (id: number) => Promise<void>;
}

// HU-26: destinatarios de alertas por nivel, ahora contra el back real
// (GET/POST/DELETE /notificaciones/configuracion). Reemplaza el mock de
// "reglas" con destinatarios individuales por el modelo real del backend:
// (empresaId, nivelAlerta, rolId) — un rol completo recibe cada nivel, no
// usuarios sueltos.
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

  const quitarRol = useCallback(async (id: number) => {
    setError(null);
    // Optimista: la card no debería tildarse esperando la respuesta. Si el
    // DELETE falla, se reinserta la fila que se sacó.
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

  return { configuraciones, isLoading, error, agregarRol, quitarRol };
}
