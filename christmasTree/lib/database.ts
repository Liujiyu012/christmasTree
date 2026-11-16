export type QueryResult<T> = { rows: T[]; rowCount?: number | null; affectedRows?: number };
export type Query = <T = Record<string, unknown>>(sql: string, values?: unknown[]) => Promise<QueryResult<T>>;
export type Transaction = <T>(work: (query: Query) => Promise<T>) => Promise<T>;

// The existing application uses positional ? parameters. Only fixed, application-
// owned SQL reaches this adapter; values always travel separately to PostgreSQL.
export class Database {
  readonly query: Query;
  readonly transaction: Transaction;
  constructor(query: Query, transaction: Transaction) { this.query = query; this.transaction = transaction; }
  prepare(sql: string) { return new Statement(this, sql); }
  async batch(statements: Statement[]) {
    return this.transaction(async query => {
      const results = [];
      for (const statement of statements) results.push(await statement.execute(query));
      return results;
    });
  }
  atomic<T>(work: (db: Database) => Promise<T>) {
    return this.transaction(query => work(new Database(query, async inner => inner(query))));
  }
}
class Statement {
  private values: unknown[] = [];
  private db: Database;
  private sql: string;
  constructor(db: Database, sql: string) { this.db = db; this.sql = sql; }
  bind(...values: unknown[]) { this.values = values; return this; }
  async execute<T = Record<string, unknown>>(query = this.db.query) {
    let i = 0;
    const sql = this.sql.replace(/\?/g, () => `$${++i}`);
    if (i !== this.values.length) throw new Error("SQL parameter count mismatch");
    const result = await query<T>(sql, this.values);
    return { results: result.rows, meta: { changes: result.rowCount ?? result.affectedRows ?? result.rows.length } };
  }
  async first<T = Record<string, unknown>>() { return (await this.execute<T>()).results[0] ?? null; }
  all<T = Record<string, unknown>>() { return this.execute<T>(); }
  run() { return this.execute(); }
}
