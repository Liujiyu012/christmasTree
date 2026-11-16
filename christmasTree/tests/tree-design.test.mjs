import { test } from 'node:test';
import assert from 'node:assert/strict';
import { database } from './database.mjs';
import { writeTree, readTree } from '../lib/tree-service.ts';
import { DEFAULT_DESIGN, treeSlots } from '../lib/tree-design.ts';

test('all 125 designs persist and are visible to an invited visitor',async()=>{
  const db=await database();
  for(let topper=0;topper<5;topper++)for(let shape=0;shape<5;shape++)for(let base=0;base<5;base++){
    const design={topper,shape,base},user=`owner-${topper}-${shape}-${base}`;
    const {id}=await writeTree(db,user,{action:'create',name:'小林',design});
    assert.deepEqual((await readTree(db,null,id)).tree.design,design);
    assert.equal((await readTree(db,null,id)).tree.isOwner,false);
  }
});
test('changing the tree keeps all 30 gifts, stable slot IDs and private letters',async()=>{
  const db=await database(),{id}=await writeTree(db,'owner',{action:'create',name:'小林'});
  for(let i=0;i<30;i++)await writeTree(db,`friend-${i}`,{action:'decorate',treeId:id,kind:i,slot:i,signature:'朋友',body:`秘密-${i}`,anonymous:true});
  const before=await readTree(db,'owner',id),letters=await readTree(db,'owner',id,true);
  for(let shape=0;shape<5;shape++){
    await writeTree(db,'owner',{action:'customize',treeId:id,design:{shape,topper:4,base:2}});
    const after=await readTree(db,'owner',id);
    assert.deepEqual(after.gifts,before.gifts);
    assert.deepEqual(await readTree(db,'owner',id,true),letters);
    assert.deepEqual((await readTree(db,'stranger',id,true)).letters,[]);
    assert.equal(treeSlots(shape).length,30);
    assert.equal(new Set(treeSlots(shape).map(p=>p.join(','))).size,30);
  }
});
test('only the owner can customize; malformed designs cannot change stored choices',async()=>{
  const db=await database(),design={topper:4,shape:3,base:2};
  const {id}=await writeTree(db,'owner',{action:'create',name:'小林',design});
  for(const user of [null,'friend'])await assert.rejects(writeTree(db,user,{action:'customize',treeId:id,design:DEFAULT_DESIGN}),e=>e.status===(user?403:401));
  for(const invalid of [null,[],{},'0',{...design,shape:'1'},{...design,base:5},{...design,topper:-1},{...design,shape:1.5}]){
    await assert.rejects(writeTree(db,'owner',{action:'customize',treeId:id,design:invalid}),e=>e.status===400);
    await assert.rejects(writeTree(db,'new-owner',{action:'create',name:'小林',design:invalid}),e=>e.status===400);
  }
  assert.deepEqual((await readTree(db,null,id)).tree.design,design);
  const again=await writeTree(db,'owner',{action:'create',name:'小林',design:DEFAULT_DESIGN});
  assert.equal(again.id,id);assert.deepEqual((await readTree(db,null,id)).tree.design,design);
});
test('legacy imports without design columns receive a valid default',async()=>{
  const db=await database();
  await db.prepare('INSERT INTO trees (id,owner_id,name,created_at) VALUES (?,?,?,?)').bind('legacy','owner','原来的树',1).run();
  assert.deepEqual((await readTree(db,null,'legacy')).tree.design,DEFAULT_DESIGN);
  await assert.rejects(db.prepare('UPDATE trees SET shape = 5 WHERE id = ?').bind('legacy').run());
});
