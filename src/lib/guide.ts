/**
 * Reemplaza los marcadores {{NOMBRE}} de la guía por los datos de quien la está viendo: la URL
 * del API de la app, el slug de la empresa… Un marcador sin valor se deja tal cual, para que se
 * note que falta en vez de desaparecer del ejemplo.
 */
export function fillGuide(source: string, values: Record<string, string | null | undefined>) {
  return source.replace(/\{\{([A-Z_]+)\}\}/g, (match, key: string) => values[key] || match)
}
