# 🤖 Guía de trabajo con IA — Frontend | HexaTech / OptiLácteo

> **UTN FRVM · Proyecto Final 2026 · Equipo 2**  
> Antes de tocar cualquier línea de código, leé este archivo completo y pegá el bloque de la Sección 1 en tu sesión de IA.

---

## Índice

1. [Prompt base para la IA](#1-prompt-base-para-la-ia-pegarlo-al-inicio-de-cada-sesión)
2. [Ramas del repositorio y orden de trabajo](#2-ramas-del-repositorio-y-orden-de-trabajo)
3. [Flujo completo para trabajar una historia](#3-flujo-completo-para-trabajar-una-historia)
4. [Estructura de componentes React](#4-estructura-de-componentes-react)
5. [Convenciones de código](#5-convenciones-de-código)
6. [Consumo de la API backend](#6-consumo-de-la-api-backend)
7. [Conventional Commits](#7-conventional-commits)
8. [Template de Pull Request](#8-template-de-pull-request)
9. [Definition of Done (DoD)](#9-definition-of-done-dod)
10. [Qué pedirle a la IA y cómo](#10-qué-pedirle-a-la-ia-y-cómo)

---

## 1. Prompt base para la IA (pegarlo al inicio de cada sesión)

Copiá **todo** el bloque de abajo y pegalo como **primer mensaje** cada vez que abras una sesión nueva con cualquier IA (Claude, ChatGPT, Copilot, etc.).

```
# Contexto del proyecto — OptiLácteo (Frontend)

Sos un asistente de desarrollo para el equipo HexaTech (Equipo 2, UTN FRVM, Proyecto Final 2026).
El proyecto se llama OptiLácteo: una plataforma SaaS multi-tenant para industrias lácteas.
Estoy trabajando en el FRONTEND.

## Stack frontend
- Librería:     React 18 + TypeScript
- Bundler:      Vite
- Estilos:      Tailwind CSS
- HTTP client:  Axios (consumo de API REST del backend NestJS)
- Estado:       React hooks (useState, useEffect, useContext)
- Routing:      React Router v6
- Linter:       ESLint + Prettier

## Principios de código obligatorios
1. El frontend NUNCA accede directo a la BD — solo consume la API REST del backend.
2. Toda llamada a la API incluye el JWT en el header Authorization: Bearer <token>.
3. Componentes funcionales con hooks — sin class components.
4. Separación clara: pages/, components/, services/, hooks/, context/.
5. Los servicios de API van en src/services/ — nunca fetch/axios directo en un componente.
6. El token JWT se guarda en memoria o sessionStorage — nunca en localStorage.
7. Código en inglés (variables, funciones, componentes). Comentarios en español.
8. Conventional Commits: feat | fix | docs | test | refactor | chore.
9. Diseño responsivo con Tailwind — adaptado a entornos industriales (controles claros y legibles).
10. Sin console.log en código productivo.

## Conexión con el backend (Sprint 1)
- Base URL API: http://localhost:3000/api/v1
- Auth: JWT Bearer token en cada request
- El backend corre en NestJS local en puerto 3000

## Estado actual
- Sprint activo: Sprint 1
- Backend corre local en puerto 3000.
- Rama de trabajo: ver sección de ramas en este CONTRIBUTING.md.

Cuando generes código, seguí siempre estas convenciones.
Si algo no está claro, preguntame antes de asumir.
```

---

## 2. Ramas del repositorio y orden de trabajo

### Estructura de ramas

```
main          ← baseline oficial. Solo recibe merges desde develop al cierre de cada Sprint.
│
└── develop   ← rama de integración. Todo el desarrollo converge aquí.
     │
     ├── feature/ui-login               (1)
     ├── feature/ui-gestion-usuarios    (2)
     ├── feature/ui-gestion-empresas    (3)
     └── feature/ui-dashboard           (4)
```

### Orden de desarrollo recomendado — Sprint 1

| # | Rama | Por qué va en este orden |
|---|------|--------------------------|
| 1 | `feature/ui-login` | Primero: pantalla de login, manejo de JWT y contexto de auth |
| 2 | `feature/ui-gestion-usuarios` | Depende de auth — requiere token para consumir la API |
| 3 | `feature/ui-gestion-empresas` | Depende de auth — requiere token para consumir la API |
| 4 | `feature/ui-dashboard` | Último: consume datos de todos los módulos anteriores |

> 💡 Las ramas sin dependencia entre sí pueden trabajarse en paralelo.

### Reglas de ramas

| Rama | Push directo | Cómo entran los cambios |
|------|-------------|------------------------|
| `main` | ❌ Nunca | Solo PR aprobado desde `develop` al cierre del Sprint |
| `develop` | ❌ Nunca | Solo PR aprobado desde `feature/*` o `fix/*` |
| `feature/*` | ✅ El integrante asignado | Push directo, luego PR hacia `develop` |
| `fix/*` | ✅ El integrante asignado | Push directo, luego PR hacia `develop` |

---

## 3. Flujo completo para trabajar una historia

```bash
# 1. Sincronizá develop antes de arrancar
git checkout develop
git pull origin develop

# 2. Posicionarte en tu rama
git checkout feature/ui-login   # ejemplo

# 3. Sincronizar tu rama con develop
git rebase origin/develop

# 4. Desarrollar y hacer commits frecuentes
git add .
git commit -m "feat(ui): agregar formulario de login con validación"

# 5. Antes del push, sincronizar nuevamente
git fetch origin
git rebase origin/develop

# 6. Push
git push origin feature/ui-login

# 7. Abrir Pull Request hacia develop en GitHub
# 8. Esperar aprobación de al menos 1 integrante distinto al autor
# 9. Merge aprobado → cerrar el Issue vinculado
```

> ⚠️ Nunca hacer `git push origin develop` ni `git push origin main` directo.  
> ⚠️ Nunca aprobar tu propio PR.

---

## 4. Estructura de componentes React

### Árbol de carpetas

```
src/
  pages/               ← una carpeta por página/vista principal
    Login/
      LoginPage.tsx
    Dashboard/
      DashboardPage.tsx
    Usuarios/
      UsuariosPage.tsx
    Empresas/
      EmpresasPage.tsx
  components/          ← componentes reutilizables
    ui/                ← botones, inputs, badges, modales genéricos
      Button.tsx
      Input.tsx
      Badge.tsx
    layout/            ← navbar, sidebar, layout general
      Navbar.tsx
      Sidebar.tsx
      Layout.tsx
  services/            ← toda la comunicación con la API va acá
    api.ts             ← instancia de Axios con baseURL y JWT interceptor
    auth.service.ts
    usuarios.service.ts
    empresas.service.ts
  hooks/               ← custom hooks
    useAuth.ts
    useUsuarios.ts
  context/             ← contextos globales
    AuthContext.tsx
  types/               ← interfaces y tipos TypeScript
    usuario.types.ts
    empresa.types.ts
```

### Responsabilidades

| Carpeta | Hace | NO hace |
|---------|------|---------|
| `pages/` | Orquesta componentes, llama a servicios, maneja estado de la vista | Lógica de negocio compleja, fetch directo |
| `components/` | Renderiza UI, recibe props, emite eventos | Llamadas a la API, estado global |
| `services/` | Llama a la API REST, devuelve datos tipados | Renderizar UI, manejar estado |
| `hooks/` | Encapsula lógica reutilizable con estado | Renderizar UI |
| `context/` | Estado global (auth, tenant) | Llamadas directas a la API |

### Configuración de Axios con JWT

```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
});

// Interceptor: agrega el JWT a cada request automáticamente
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## 5. Convenciones de código

### Nomenclatura

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Componentes | `PascalCase` | `LoginForm`, `UsuariosTable` |
| Archivos de componentes | `PascalCase.tsx` | `LoginForm.tsx` |
| Variables / funciones / hooks | `camelCase` | `isLoading`, `useAuth()` |
| Servicios / helpers | `camelCase.ts` | `auth.service.ts` |
| Tipos / interfaces | `PascalCase` | `UsuarioType`, `EmpresaResponse` |
| Constantes | `UPPER_SNAKE_CASE` | `API_BASE_URL` |
| Clases Tailwind | utilidades estándar | `bg-blue-600 text-white rounded` |

### Idioma
- **Inglés**: variables, funciones, nombres de componentes, props.
- **Español**: comentarios, textos visibles en la UI, mensajes de error al usuario.

### Reglas generales
- Componentes funcionales con hooks — sin class components.
- Un componente por archivo.
- Props tipadas con TypeScript (no usar `any`).
- Sin `console.log` en código productivo.
- Indentación: 2 espacios. Sin tabs.

### Variables de entorno

```env
# .env.local (nunca subir a GitHub)
VITE_API_URL=http://localhost:3000/api/v1
```

> ⚠️ En Vite las variables de entorno deben empezar con `VITE_` para ser accesibles en el cliente.

---

## 6. Consumo de la API backend

### Regla principal

**Nunca** hacer `fetch` o `axios` directamente en un componente. Toda llamada a la API va en `src/services/`.

### Ejemplo de servicio

```typescript
// src/services/usuarios.service.ts
import api from './api';
import { UsuarioType } from '../types/usuario.types';

export const usuariosService = {
  getAll: async (): Promise<UsuarioType[]> => {
    const { data } = await api.get('/usuarios');
    return data;
  },

  create: async (payload: CreateUsuarioDto): Promise<UsuarioType> => {
    const { data } = await api.post('/usuarios', payload);
    return data;
  },
};
```

### Endpoints disponibles (backend Sprint 1)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Login, devuelve JWT |
| POST | `/auth/logout` | Cierre de sesión |
| GET | `/usuarios` | Listar usuarios del tenant |
| POST | `/usuarios` | Crear usuario |
| GET | `/empresas` | Listar empresas |
| POST | `/empresas` | Crear empresa |

> Los endpoints se documentan automáticamente en Swagger: `http://localhost:3000/api/docs`

---

## 7. Conventional Commits

```
<tipo>(<scope>): <descripción en español>
```

| Tipo | Cuándo |
|------|--------|
| `feat` | Nueva funcionalidad o componente |
| `fix` | Corrección de bug visual o funcional |
| `docs` | Documentación |
| `test` | Tests |
| `refactor` | Refactorización sin cambio de comportamiento |
| `chore` | Mantenimiento, dependencias |

### Ejemplos correctos
```bash
feat(ui): agregar formulario de login con validación de campos
feat(ui): agregar tabla de usuarios con paginación
fix(ui): corregir redirección tras logout en Safari
refactor(auth): mover lógica de token a useAuth hook
chore(deps): actualizar react-router-dom a v6.22
```

---

## 8. Template de Pull Request

```markdown
## Descripción del cambio
Qué se implementó y por qué.

## Issue relacionado
Closes #<NNN>

## Tipo de cambio
- [ ] feat  
- [ ] fix  
- [ ] refactor  
- [ ] test  
- [ ] chore

## Rama origen → destino
`feature/ui-<nombre>` → `develop`

## Cambios realizados
- `ComponenteX.tsx`: descripción
- `servicio.service.ts`: descripción

## Pruebas realizadas
- [ ] Probado en Chrome
- [ ] Probado en Firefox
- [ ] Responsivo en mobile
- [ ] Sin errores en consola del navegador

## Checklist
- [ ] Toda llamada a la API va en `src/services/`
- [ ] JWT incluido via interceptor de Axios (no hardcodeado)
- [ ] Componentes tipados con TypeScript (sin `any`)
- [ ] `.env.local` NO incluido en el commit
- [ ] Conventional Commits en todos los commits
- [ ] ESLint sin errores (`npx eslint . --fix`)
- [ ] Sin `console.log` en código productivo
```

> ⚠️ PR sin checklist completo no se aprueba.  
> ⚠️ El autor NO puede aprobar su propio PR.

---

## 9. Definition of Done (DoD)

Una historia se considera **TERMINADA** cuando cumple **TODO**:

- [ ] Estructura de carpetas respetada (`pages/`, `components/`, `services/`).
- [ ] PR aprobado por al menos 1 integrante distinto al autor.
- [ ] Probado en Chrome y Firefox sin errores en consola.
- [ ] Diseño responsivo con Tailwind.
- [ ] Toda llamada a la API va en `src/services/` con JWT via interceptor.
- [ ] Componentes tipados (sin `any`).
- [ ] Sin `console.log` en código productivo.
- [ ] Criterios de aceptación validados por el Product Owner.
- [ ] Conventional Commits en todos los commits.
- [ ] `.env.local` no subido al repositorio.
- [ ] ESLint sin errores.
- [ ] Issue de GitHub cerrado con referencia al PR.

---

## 10. Qué pedirle a la IA y cómo

### ✅ Prompts efectivos

```
Necesito el componente LoginPage en React con TypeScript y Tailwind CSS.
Debe tener un formulario con email y password, validación básica,
y al hacer submit debe llamar a authService.login() y guardar el
JWT en sessionStorage. Si el login es exitoso redirigir a /dashboard
usando React Router v6.

---

Necesito el servicio de usuarios en src/services/usuarios.service.ts
que consuma la API en /api/v1/usuarios. Usar la instancia de Axios
de src/services/api.ts que ya tiene el interceptor del JWT.
Necesito los métodos: getAll(), getById(id), create(dto), deactivate(id).

---

Necesito un componente UsuariosTable que reciba un array de usuarios
como prop y los muestre en una tabla con Tailwind CSS. Columnas:
nombre, email, rol, estado (activo/inactivo con badge de color).
```

### ❌ Evitar
```
"Haceme una tabla de usuarios en React"    ← sin contexto de Tailwind ni servicios
"Cómo hago login"                          ← sin mencionar React Router ni sessionStorage
```

### ✅ La IA siempre debe incluir
- Estructura de carpetas (dónde va cada archivo).
- Imports explícitos.
- Tipado TypeScript completo (sin `any`).
- Clases Tailwind para el diseño.
- Uso de `src/services/` para llamadas a la API.

---

*HexaTech — Equipo 2 | UTN FRVM | Proyecto Final 2026 | OptiLácteo*  
*Cignetti · Milanesio · Romero · Toranzo · Torres | PO: Ing. Villafañe / Ing. Cassani*
