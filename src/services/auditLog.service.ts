// HU-43: log de auditoría transversal (optilacteo-backend, PR #142,
// module/audit). Solo Gerente (@Roles del controller); el backend filtra
// por la empresa del JWT.
//
// GET /audit-log         -> paginado, responde [registros, total]
// GET /audit-log/export  -> CSV armado en el backend, mismos filtros, sin paginar
import api from "./api";
import type {
  AuditLogFilterQuery,
  AuditLogRawResponse,
  AuditLogResponse,
} from "../types/auditLog.types";

export const auditLogService = {
  getAll: async (filters: AuditLogFilterQuery = {}): Promise<AuditLogResponse> => {
    const { data } = await api.get<AuditLogRawResponse>("/audit-log", { params: filters });
    const [registros, total] = data;
    return { data: registros, total };
  },

  // Exporta todo lo que matchea los filtros, no solo la página visible.
  // Mismo patrón blob + link temporal que historialAlertasService.exportCsv.
  exportCsv: async (
    filters: Omit<AuditLogFilterQuery, "page" | "limit"> = {},
  ): Promise<void> => {
    const { data } = await api.get<Blob>("/audit-log/export", {
      params: filters,
      responseType: "blob",
    });

    // El backend no agrega BOM: sin esto Excel en Windows rompe tildes/ñ
    // (mismo criterio que exportarTrazabilidadCsv.ts).
    const blob = new Blob(["﻿", data], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `log-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
