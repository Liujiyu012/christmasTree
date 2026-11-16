import { getDatabase } from "@netlify/database";
import { Database, type Query } from "./database.ts";

let instance: Database | undefined;
export function database() {
  if (instance) return instance;
  const { pool } = getDatabase();
  instance = new Database(
    ((sql, values) => pool.query(sql, values)) as Query,
    async work => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const value = await work(((sql, values) => client.query(sql, values)) as Query);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally { client.release(); }
    },
  );
  return instance;
}
