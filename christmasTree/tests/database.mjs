import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach } from 'node:test';
import { Database } from '../lib/database.ts';
const opened=[];
afterEach(async()=>{while(opened.length)await opened.pop().close();});
export async function database() {
  const pg=new PGlite();opened.push(pg);
  const migrations=new URL('../netlify/database/migrations/',import.meta.url);
  for(const file of readdirSync(migrations).filter(name=>name.endsWith('.sql')).sort())await pg.exec(readFileSync(new URL(file,migrations),'utf8'));
  const db=new Database((sql,values)=>pg.query(sql,values),work=>pg.transaction(tx=>work((sql,values)=>tx.query(sql,values))));
  db.sql=pg;
  return db;
}
