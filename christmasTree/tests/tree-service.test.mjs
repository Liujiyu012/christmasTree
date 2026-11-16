import { test } from 'node:test';
import assert from 'node:assert/strict';
import { database } from './database.mjs';
import { readTree, writeTree } from '../lib/tree-service.ts';
async function create(db,user='owner'){return (await writeTree(db,user,{action:'create',name:'小林'})).id;}
const gift=(treeId,extra={})=>({action:'decorate',treeId,kind:0,slot:0,signature:'署名小鹿',body:'只给树主人的秘密',anonymous:false,...extra});

test('one account has one tree and one ornament per tree; replacing changes the original',async()=>{
 const db=await database(),id=await create(db);assert.equal(await create(db),id);
 await writeTree(db,'friend',gift(id));await writeTree(db,'friend',gift(id,{kind:12,slot:7}));
 const data=await readTree(db,'owner',id);assert.equal(data.gifts.length,1);assert.equal(data.gifts[0].kind,12);assert.equal(data.gifts[0].slot,7);assert.equal(data.mine,null);
});
test('slot contention returns 409 and preserves the existing decoration',async()=>{
 const db=await database(),id=await create(db);await writeTree(db,'friend1',gift(id));
 await assert.rejects(writeTree(db,'friend2',gift(id)),e=>e.status===409);
 await writeTree(db,'friend2',gift(id,{slot:1}));
 await assert.rejects(writeTree(db,'friend2',gift(id)),e=>e.status===409);
 assert.equal((await readTree(db,'friend2',id)).mine.slot,1);
});
test('public payload excludes letters, account IDs and anonymous signatures',async()=>{
 const db=await database(),id=await create(db);await writeTree(db,'private-user-id',gift(id,{anonymous:true}));
 for(const user of [null,'stranger','owner']){
  const data=await readTree(db,user,id);const raw=JSON.stringify(data);
  for(const privateValue of ['只给树主人的秘密','署名小鹿','private-user-id','owner_id','sender_id'])assert.equal(raw.includes(privateValue),false);
  assert.equal(data.gifts[0].name,'一位朋友');
  assert.equal(data.gifts[0].nameHidden,true);
 }
 assert.equal((await readTree(db,'private-user-id',id)).mine.signature,'署名小鹿');
});
test('self-gifts appear anonymous to visitors while the owner retains their editable draft',async()=>{
 const db=await database(),id=await create(db);
 await writeTree(db,'friend',gift(id,{slot:1,signature:'朋友署名'}));
 for(const anonymous of [false,true]){
  await writeTree(db,'owner',gift(id,{signature:'写给自己的署名',body:'写给自己的信',anonymous}));
  const own=await readTree(db,'owner',id);
  assert.equal(own.tree.isOwner,true);assert.equal(own.gifts[0].mine,true);
  assert.equal(own.mine.signature,'写给自己的署名');assert.equal(own.mine.body,'写给自己的信');
  assert.equal(own.mine.anonymous,anonymous);
  for(const user of [null,'stranger','friend']){
   const view=await readTree(db,user,id);
   assert.equal(view.gifts[0].name,'一位朋友');assert.equal(view.gifts[0].mine,false);
   assert.equal(view.gifts[1].name,'朋友署名');
   assert.equal(JSON.stringify(view).includes('写给自己的'),false);
  }
  const friend=await readTree(db,'friend',id);
  assert.equal(friend.tree.isOwner,false);assert.equal(friend.gifts[1].mine,true);
  assert.equal(friend.mine.signature,'朋友署名');
 }
});
test('letters are readable only by the owner and the sender; anonymous signature stays hidden',async()=>{
 const db=await database(),id=await create(db);await writeTree(db,'alice',gift(id,{anonymous:true}));await writeTree(db,'bob',gift(id,{slot:1,signature:'小熊',body:'另一封信'}));
 await assert.rejects(readTree(db,null,id,true),e=>e.status===401);
 assert.deepEqual((await readTree(db,'stranger',id,true)).letters,[]);
 assert.equal((await readTree(db,'alice',id,true)).letters.length,1);
 const mail=(await readTree(db,'owner',id,true)).letters;assert.equal(mail.length,2);
 assert.ok(mail.some(l=>l.signature==='一位悄悄想念你的人'));assert.equal(JSON.stringify(mail).includes('署名小鹿'),false);
});
test('requires sign-in and validates slot, type and letter length',async()=>{
 const db=await database(),id=await create(db);
 await assert.rejects(writeTree(db,null,gift(id)),e=>e.status===401);
 for(const extra of [{slot:30},{slot:-1},{slot:1.5},{kind:30},{kind:'1'},{body:'x'.repeat(501)}])await assert.rejects(writeTree(db,'alice',gift(id,extra)),e=>e.status===400);
});
test('30 different friends fill the tree; further friends cannot occupy a slot',async()=>{
 const db=await database(),id=await create(db);
 for(let i=0;i<30;i++)await writeTree(db,'friend'+i,gift(id,{slot:i,kind:i,body:''}));
 assert.equal((await readTree(db,null,id)).gifts.length,30);
 await assert.rejects(writeTree(db,'extra-friend',gift(id)),e=>e.status===409);
});
test('only the sender can remove gifts; the tree owner and other visitors cannot',async()=>{
 const db=await database(),id=await create(db);await writeTree(db,'alice',gift(id));const giftId=(await readTree(db,'alice',id)).mine.id;
 for(const user of ['stranger','owner'])await assert.rejects(writeTree(db,user,{action:'remove',treeId:id,giftId}),e=>e.status===403);
 assert.equal((await readTree(db,'alice',id)).mine.body,'只给树主人的秘密');
 await assert.rejects(writeTree(db,'alice',{action:'rename',treeId:id,name:'hijack'}),e=>e.status===403);
 await writeTree(db,'alice',{action:'remove',treeId:id,giftId});
 assert.equal((await readTree(db,'owner',id,true)).letters.length,0);assert.equal((await readTree(db,null,id)).gifts.length,0);
});
test('letters and permissions remain separated between trees',async()=>{
 const db=await database(),id=await create(db),other=await create(db,'other-owner');await writeTree(db,'alice',gift(id));
 assert.deepEqual((await readTree(db,'other-owner',id,true)).letters,[]);
 assert.equal((await readTree(db,'owner',other)).tree.isOwner,false);
 await assert.rejects(writeTree(db,'alice',gift('missing-tree')),e=>e.status===404);
});

test('editing a letter preserves its ornament; other users cannot overwrite it',async()=>{
 const db=await database(),id=await create(db);
 await writeTree(db,'alice',gift(id,{kind:12,slot:7}));
 const original=(await readTree(db,'alice',id)).mine;
 await writeTree(db,'alice',gift(id,{...original,body:'更新后的祝福',signature:'小鹿的新署名'}));
 const edited=(await readTree(db,'alice',id)).mine;
 assert.equal(edited.id,original.id);assert.equal(edited.kind,12);assert.equal(edited.slot,7);
 assert.equal(edited.body,'更新后的祝福');assert.equal(edited.signature,'小鹿的新署名');
 for(const user of ['owner','stranger']){
  await assert.rejects(writeTree(db,user,gift(id,{...edited,body:'不应覆盖'})),e=>e.status===409);
  assert.deepEqual((await readTree(db,'alice',id)).mine,edited);
 }
});
