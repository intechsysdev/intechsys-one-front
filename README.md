# one-front

Portal de administración. React 19, Vite, TypeScript y Tailwind CSS v4.

```bash
npm install
npm run dev       # http://localhost:5173, con proxy de /api a http://localhost:5180
npm run build     # comprobación de tipos + bundle de producción
npm run preview   # sirve el bundle generado
```

## Estructura

```
src/
├── lib/          cliente HTTP con refresh automático, tipos del API, hooks de React Query
├── providers/    sesión (AuthProvider) y tema (ThemeProvider)
├── components/
│   ├── ui/       primitivas del sistema de diseño
│   ├── layout/   AppShell, barra lateral, paleta de comandos
│   └── domain/   formularios y paneles propios del producto
└── pages/        una por ruta
```

## Sistema de diseño

Los tokens viven en `src/index.css` como variables CSS en espacio **OKLCH**, expuestas a
Tailwind con `@theme inline`. Hay dos temas completos (claro y oscuro): el oscuro no es una
inversión automática, tiene sus propios pasos de luminosidad y de croma.

Convenciones que conviene respetar al añadir pantallas:

- **El entorno es una señal de riesgo.** `Development`, `Staging` y `Production` tienen color
  propio (`--env-*`) y se muestran siempre que un dato dependa del entorno.
- **Los secretos nacen ocultos.** Revelarlos es una acción explícita que llama al API y
  queda auditada; el formulario devuelve `••••••••` cuando el campo no se tocó, y el API
  lo interpreta como «no cambies este valor».
- **Las acciones irreversibles se confirman** y explican qué se rompe (`ConfirmDialog`).
- **Números en `tabular`** para que las columnas se alineen.
- **Estados vacíos con acción**, no solo con texto.

## Atajos

| Atajo | Acción |
|---|---|
| `Ctrl/⌘ + K` | Paleta de comandos: navegación, búsqueda de empresas y acciones rápidas. |
| `↑` `↓` `Enter` | Recorrer y ejecutar dentro de la paleta. |
| `Esc` | Cerrar paleta o diálogo. |
