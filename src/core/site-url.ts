export function trimLeadingSlash(value: string): string {
  return value.startsWith('/') ? value.slice(1) : value;
}

export function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}
