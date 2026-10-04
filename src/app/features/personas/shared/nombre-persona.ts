/** Nombre visible de una persona: el nombre completo vive en `nombre` y el apellido queda solo por datos anteriores. */
export function nombreCompletoPersona(
  persona?: { nombre?: string | null; apellido?: string | null } | null,
): string {
  return [persona?.nombre, persona?.apellido]
    .map((parte) => parte?.trim())
    .filter((parte): parte is string => !!parte)
    .join(' ');
}
