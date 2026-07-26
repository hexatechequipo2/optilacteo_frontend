import { io, type Socket } from "socket.io-client";

const WS_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Mismo mecanismo que el interceptor de axios en api.ts: el JWT vive en
// sessionStorage y no hay getter expuesto por useAuth(), así que se lee
// directo de ahí. autoConnect en false: quien llama decide cuándo conectar
// (por ejemplo, después de que termine la carga inicial por REST).
export function createSocket(namespace: string): Socket {
  const token = sessionStorage.getItem("token");

  return io(`${WS_BASE_URL}${namespace}`, {
    auth: { token },
    autoConnect: false,
  });
}
