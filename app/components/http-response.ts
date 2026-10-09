export async function parseJsonResponse<T extends Record<string, unknown>>(response: Response): Promise<T> {
  const body = await response.text();
  if (!body) return {} as T;

  try {
    const data: unknown = JSON.parse(body);
    return data && typeof data === "object" ? data as T : {} as T;
  } catch {
    return { error: "Server je vratio neispravan odgovor." } as unknown as T;
  }
}
