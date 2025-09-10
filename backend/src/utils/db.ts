export async function queryOne<T>(db: D1Database, sql: string, ...params: unknown[]): Promise<T | null> {
  const stmt = db.prepare(sql).bind(...params);
  const res = await stmt.all<T>();
  const rows = res.results as unknown as T[] | undefined;
  return rows && rows.length > 0 ? rows[0] : null;
}

export async function queryAll<T>(db: D1Database, sql: string, ...params: unknown[]): Promise<T[]> {
  const stmt = db.prepare(sql).bind(...params);
  const res = await stmt.all<T>();
  return (res.results as unknown as T[]) ?? [];
}

export async function run(db: D1Database, sql: string, ...params: unknown[]): Promise<number> {
  const stmt = db.prepare(sql).bind(...params);
  const res = await stmt.run();
  // D1 returns meta.last_row_id
  // @ts-ignore
  return res.meta?.last_row_id ?? 0;
}
