/**
 * Narrows an untrusted string to one of a Prisma enum's values.
 *
 * Not `value in EnumObject`: the generated enums are plain object literals, so `in`
 * also matches everything on Object.prototype. `?institute=constructor` passed that
 * check, was cast to Institute, and reached Prisma as an invalid enum value — a
 * body-less 500 from a crafted query string.
 *
 * Returning the narrowed value rather than a boolean is the point: it removes the
 * `as Institute` casts at the call sites, which were what let the broken check pass
 * for a value the type system had never actually verified.
 */
export function parseEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: string | null | undefined,
): T[keyof T] | null {
  if (typeof value !== "string") {
    return null;
  }
  const values = Object.values(enumObject) as T[keyof T][];
  return values.includes(value as T[keyof T]) ? (value as T[keyof T]) : null;
}
