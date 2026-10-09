/**
 * Minimal Turso HTTP client — uses fetch only, no WebSocket dependencies.
 * Compatible with Cloudflare Workers (workerd) without any bundler issues.
 */

type SqlValue = string | number | null;

interface TursoCol { name: string }
interface TursoVal { type: string; value: string | null }
interface TursoResultSet {
  cols: TursoCol[];
  rows: TursoVal[][];
  affected_row_count: number;
  last_insert_rowid: string | null;
}

function getConfig() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  return { url: url.replace(/^libsql:\/\//, "https://"), token };
}

function encodeArg(v: SqlValue): TursoVal {
  if (v === null) return { type: "null", value: null };
  if (typeof v === "number")
    return Number.isInteger(v) ? { type: "integer", value: String(v) } : { type: "real", value: String(v) };
  return { type: "text", value: String(v) };
}

function decodeVal(v: TursoVal): SqlValue {
  if (!v || v.type === "null" || v.value === null) return null;
  if (v.type === "integer") return Number(v.value);
  if (v.type === "real") return parseFloat(v.value);
  return v.value;
}

function toRow(cols: TursoCol[], rawRow: TursoVal[]): Record<string, SqlValue> {
  const row: Record<string, SqlValue> = {};
  cols.forEach((col, i) => { row[col.name] = decodeVal(rawRow[i]); });
  return row;
}

export async function tursoExecute(
  sql: string,
  args: SqlValue[] = []
): Promise<{ rows: Record<string, SqlValue>[]; affected: number; lastRowId: string | null }> {
  const { url, token } = getConfig();
  const res = await fetch(`${url}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: args.map(encodeArg), want_rows: true } },
        { type: "close" },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Turso HTTP ${res.status}: ${text}`);
  }

  const data = await res.json() as { results: { type: string; response?: { type: string; result?: TursoResultSet }; error?: { message: string } }[] };
  const first = data.results[0];
  if (first.type === "error" || first.error) {
    throw new Error(first.error?.message ?? "Turso query error");
  }
  const result = first.response?.result;
  if (!result) return { rows: [], affected: 0, lastRowId: null };
  return {
    rows: result.rows.map((r) => toRow(result.cols, r)),
    affected: result.affected_row_count,
    lastRowId: result.last_insert_rowid,
  };
}

export async function tursoBatch(
  statements: { sql: string; args?: SqlValue[] }[]
): Promise<void> {
  const { url, token } = getConfig();
  const requests = [
    ...statements.map((s) => ({
      type: "execute",
      stmt: { sql: s.sql, args: (s.args ?? []).map(encodeArg), want_rows: false },
    })),
    { type: "close" },
  ];

  const res = await fetch(`${url}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) throw new Error(`Turso batch HTTP ${res.status}`);

  const data = await res.json() as { results: { type: string; error?: { message: string } }[] };
  for (const r of data.results) {
    if (r.type === "error" || r.error) throw new Error(r.error?.message ?? "Turso batch error");
  }
}
