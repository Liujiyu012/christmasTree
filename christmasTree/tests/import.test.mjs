import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {database} from './database.mjs';
import {importSnapshot} from '../lib/import-snapshot.ts';
const now=Date.now(),key='f'.repeat(64);
const data={cleanup:{treeIds:[],subjects:[]},trees:[{id:'old-tree',owner_id:'old-user',name:'旧树',created_at:now}],gifts:[],wechat_accounts:[]};
function request(body){return new Request('https://example.org/api/migration/import',{method:'POST',body,headers:{'x-migration-time':String(now),'x-migration-signature':createHmac('sha256',Buffer.from(key,'hex')).update(now+'\n'+body).digest('hex')}});}
test('one-time import is disabled by default and bound to the exact approved snapshot',async()=>{
 const db=await database(),body=JSON.stringify(data),env={MIGRATION_SIGNING_KEY:key,MIGRATION_IMPORT_HASH:createHash('sha256').update(body).digest('hex')};
 await assert.rejects(importSnapshot(()=>db,request(body),{},now),e=>e.status===404);
 await assert.rejects(importSnapshot(()=>db,request(body+' '),env,now),e=>e.status===403);
 await importSnapshot(()=>db,request(body),env,now);
 await assert.rejects(importSnapshot(()=>db,request(body),env,now),e=>e.code==='23505');
 assert.equal(Number((await db.sql.query('SELECT count(*) AS n FROM trees')).rows[0].n),1);
});
test('failed import rolls back both data and its replay receipt',async()=>{
 const db=await database(),body=JSON.stringify({...data,gifts:[{id:'bad',tree_id:'missing'}]}),env={MIGRATION_SIGNING_KEY:key,MIGRATION_IMPORT_HASH:createHash('sha256').update(body).digest('hex')};
 await assert.rejects(importSnapshot(()=>db,request(body),env,now));
 assert.equal(Number((await db.sql.query('SELECT count(*) AS n FROM trees')).rows[0].n),0);
 assert.equal(Number((await db.sql.query('SELECT count(*) AS n FROM migration_receipts')).rows[0].n),0);
});
