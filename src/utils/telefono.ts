// HU-73 / D-06: el teléfono admite dígitos, espacios, guiones y un + solo al
// inicio. La longitud (8 a 15, el máximo de E.164) se cuenta solo sobre los
// dígitos. El backend aplica la misma regla en su DTO.
export const TELEFONO_MIN_DIGITOS = 8;
export const TELEFONO_MAX_DIGITOS = 15;

// La columna telefono del backend es varchar(20): con separadores, un número
// de 15 dígitos puede pasarse de ese largo aunque cumpla D-06.
export const TELEFONO_MAX_CARACTERES = 20;

const TELEFONO_CARACTERES_VALIDOS = /^\+?[\d -]+$/;

// Devuelve el mensaje de error, o null si es válido. Vacío es válido porque
// el campo es opcional. Se valida sobre el valor recortado, que es lo que se envía.
export function validarTelefono(valor: string): string | null {
  const telefono = valor.trim();
  if (!telefono) return null;
  if (!TELEFONO_CARACTERES_VALIDOS.test(telefono))
    return "El teléfono solo puede tener números, espacios, guiones y un + al inicio";
  if (telefono.length > TELEFONO_MAX_CARACTERES)
    return `El teléfono no puede tener más de ${TELEFONO_MAX_CARACTERES} caracteres`;
  const digitos = telefono.replace(/\D/g, "").length;
  if (digitos < TELEFONO_MIN_DIGITOS || digitos > TELEFONO_MAX_DIGITOS)
    return `El teléfono debe tener entre ${TELEFONO_MIN_DIGITOS} y ${TELEFONO_MAX_DIGITOS} dígitos`;
  return null;
}
