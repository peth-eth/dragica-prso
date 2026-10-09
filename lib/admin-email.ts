export function parseAllowedAdmins(raw: string): string[] {
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
