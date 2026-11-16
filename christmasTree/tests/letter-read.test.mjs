import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {database} from './database.mjs';
import {readTree,writeTree} from '../lib/tree-service.ts';
const decorate=(treeId,extra={})=>({action:'decorate',treeId,kind:0,slot:0,signature:'小鹿',body:'给你的信',anonymous:false,...extra});
async function setup(){const db=await database();const {id}=await writeTree(db,'owner',{action:'create',name:'小林'});await writeTree(db,'friend',decorate(id));return {db,id};}
async function letter(db,id){return (await readTree(db,'owner',id,true)).letters[0];}
const mark=(id,l)=>({action:'read-letter',treeId:id,letterId:l.id,version:l.version});

test('incoming unread state persists only after opening a letter, not listing the mailbox',async()=>{
 const {db,id}=await setup();assert.equal((await readTree(db,'owner',id)).unreadCount,1);
 const l=await letter(db,id);assert.equal(l.unread,true);
 assert.equal((await readTree(db,'owner',id)).unreadCount,1);
 assert.deepEqual(await writeTree(db,'owner',mark(id,l)),{ok:true,unreadCount:0});
 assert.equal((await letter(db,id)).unread,false);
 assert.equal((await readTree(db,'owner',id)).unreadCount,0);
 assert.deepEqual(await writeTree(db,'owner',mark(id,l)),{ok:true,unreadCount:0});
});
test('strangers and senders cannot see recipient unread counts or mark letters read',async()=>{
 const {db,id}=await setup(),l=await letter(db,id);
 for(const user of [null,'stranger','friend']) {
  assert.equal(Object.hasOwn(await readTree(db,user,id),'unreadCount'),false);
  await assert.rejects(writeTree(db,user,mark(id,l)),e=>e.status===(user?403:401));
 }
 assert.equal((await readTree(db,'friend',id,true)).letters[0].unread,false);
 assert.deepEqual((await readTree(db,'stranger',id,true)).letters,[]);
 const other=(await writeTree(db,'another-owner',{action:'create',name:'另一个人'})).id;
 await assert.rejects(writeTree(db,'another-owner',mark(other,l)),e=>e.status===409);
 assert.equal((await readTree(db,'owner',id)).unreadCount,1);
});
test('letter edits become unread; ornament-only changes do not; stale read acknowledgement cannot hide an edit',async()=>{
 const {db,id}=await setup(),l=await letter(db,id);await writeTree(db,'owner',mark(id,l));
 await writeTree(db,'friend',decorate(id,{kind:7,slot:8}));assert.equal((await letter(db,id)).unread,false);
 await writeTree(db,'friend',decorate(id,{body:'又想起一件事'}));
 let latest=await letter(db,id);assert.equal(latest.unread,true);assert(latest.version>l.version);
 await assert.rejects(writeTree(db,'owner',mark(id,l)),e=>e.status===409);
 assert.equal((await readTree(db,'owner',id)).unreadCount,1);
 await writeTree(db,'owner',mark(id,latest));
 await writeTree(db,'friend',decorate(id,{body:'又想起一件事',anonymous:true}));
 latest=await letter(db,id);assert.equal(latest.unread,true);assert.notEqual(latest.signature,'小鹿');
});
test('self letters and empty notes never announce new mail; removal clears the count',async()=>{
 const {db,id}=await setup();await writeTree(db,'owner',decorate(id,{slot:1,body:'写给自己'}));
 await writeTree(db,'someone',decorate(id,{slot:2,body:''}));assert.equal((await readTree(db,'owner',id)).unreadCount,1);
 const l=(await readTree(db,'friend',id,true)).letters[0];await writeTree(db,'friend',{action:'remove',treeId:id,giftId:l.id});
 assert.equal((await readTree(db,'owner',id)).unreadCount,0);
 assert.equal((await letter(db,id)).unread,false);
});
test('clearing and later adding a letter resets unread; invalid read versions are rejected',async()=>{
 const {db,id}=await setup(),l=await letter(db,id);await writeTree(db,'owner',mark(id,l));
 for(const version of [0,-1,1.5,'1',undefined])await assert.rejects(writeTree(db,'owner',{...mark(id,l),version}),e=>e.status===400);
 await writeTree(db,'friend',decorate(id,{body:''}));assert.equal((await readTree(db,'owner',id)).unreadCount,0);
 await writeTree(db,'friend',decorate(id));assert.equal((await readTree(db,'owner',id)).unreadCount,1);
});
test('rollout preserves existing letters without marking history as new; later rows start unread',async()=>{
 const pg=new PGlite();try {
  await pg.exec("CREATE TABLE gifts(id text, body text); INSERT INTO gifts VALUES ('existing','原来的信');");
  await pg.exec(readFileSync(new URL('../netlify/database/migrations/004_letter_read_state.sql',import.meta.url),'utf8'));
  await pg.exec("INSERT INTO gifts(id,body) VALUES ('new','新朋友的信');");
  const {rows}=await pg.query('SELECT * FROM gifts ORDER BY id');
  assert.deepEqual(rows,[{id:'existing',body:'原来的信',letter_version:1,letter_read_version:1},{id:'new',body:'新朋友的信',letter_version:1,letter_read_version:0}]);
 } finally {await pg.close();}
});
