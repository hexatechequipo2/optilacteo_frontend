export interface EmpresaType {
  id: number;
  name: string;
  cuit: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  /** Indica si la empresa (tenant) está activa como cliente de la plataforma */
  isActive: boolean;
  plan: string;
}