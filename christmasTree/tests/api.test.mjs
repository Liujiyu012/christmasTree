import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { database } from './database.mjs';
import { createHandler } from '../lib/api.ts';
import { digest } from '../lib/wechat-crypto.ts';
import { SITE_ORIGIN } from '../lib/wechat-config.ts';
import { SESSION_COOKIE, sessionFor } from '../lib/wechat-service.ts';
import { restoreAccount, verifyMigrationTicket } from '../lib/migration.ts';
import { writeTree, readTree } from '../lib/tree-service.ts';
import { withWebhookDiagnostics } from '../lib/wechat-http.ts';
const env={WECHAT_APP_ID:'wxba5fad812f8e6fb9',WECHAT_TOKEN:'AAAAA',WECHAT_ENCODING_AES_KEY:'A'.repeat(43),WECHAT_ACCOUNT_NAME:'测试',WECHAT_ACCOUNT_ID:'example',WECHAT_LOGIN_ENABLED:'true',WECHAT_LOGIN_VISIBLE:'true'};
const secret='e'.repeat(64);
function request(path,data,token,extra={}) {return new Request(SITE_ORIGIN+path,{method:data?'POST':'GET',headers:{...(data?{origin:SITE_ORIGIN,'content-type':'application/json'}:{}),...(token?{cookie:`${SESSION_COOKIE}=${token}`}:{}) ,...extra},...(data?{body:JSON.stringify(data)}:{})});}
async function login(db,subject='a',now=Date.now()){
  const token=subject.repeat(43);
  await db.prepare('INSERT INTO wechat_accounts (subject,user_id) VALUES (?,?)').bind(subject,'wx:'+subject).run();
  await db.prepare('INSERT INTO wechat_sessions VALUES (?,?,?,?)').bind(digest(token),subject,now,now+3600000).run();
  return token;
}
function ticket(sub='old-owner',now=Date.now(),changes={}){
  const payload=Buffer.from(JSON.stringify({v:1,aud:SITE_ORIGIN,sub,nonce:'a'.repeat(32),exp:now+300000,...changes})).toString('base64url');
  return payload+'.'+createHmac('sha256',Buffer.from(secret,'hex')).update(payload).digest('base64url');
}
test('anonymous home and login instructions do not wake the database',async()=>{
  let calls=0;const handler=createHandler(()=>{calls++;throw new Error('unexpected db');},env);
  assert.equal((await handler(request('/api/tree'))).status,200);
  const status=await (await handler(request('/api/wechat'))).json();assert.equal(status.available,true);assert.equal(calls,0);
});
test('webhook diagnostics distinguish received/replied/rejected without logging secrets or content',async()=>{
  const logs=[],handler=withWebhookDiagnostics(async req=>new Response('<xml>private-reply</xml>',{status:req.method==='POST'?200:403,headers:{'Content-Type':'application/xml; charset=utf-8'}}),value=>logs.push(JSON.parse(value)));
  const reply=await handler(new Request(SITE_ORIGIN+'/api/wechat/webhook?encrypt_type=aes&msg_signature=private-signature&nonce=private-nonce',{method:'POST',body:'private-message'}));
  assert.equal(await reply.text(),'<xml>private-reply</xml>');
  assert.equal(logs[0].outcome,'received');assert.equal(logs[1].status,200);assert.equal(logs[1].reply,true);assert.equal(logs[1].encrypted,true);
  assert.ok(!JSON.stringify(logs).includes('private-'));
  await handler(new Request(SITE_ORIGIN+'/api/wechat/webhook'));assert.equal(logs[3].status,403);
  await handler(new Request(SITE_ORIGIN+'/api/tree'));assert.equal(logs.length,4);
  const failed=withWebhookDiagnostics(async()=>{throw new Error('private-error');},value=>logs.push(JSON.parse(value)));
  await assert.rejects(failed(new Request(SITE_ORIGIN+'/api/wechat/webhook')));assert.equal(logs.at(-1).outcome,'failed');assert.ok(!JSON.stringify(logs).includes('private-'));
});
test('Netlify never trusts forged ChatGPT headers or a raw WeChat ID',async()=>{
  const db=await database(),handler=createHandler(()=>db,env);
  const response=await handler(request('/api/tree',{action:'create',name:'冒充'},undefined,{'oai-authenticated-user-id':'owner','x-user-id':'owner'}));
  assert.equal(response.status,401);
  assert.equal((await handler(request('/api/tree',{action:'create',name:'冒充'},'openid_123'))).status,401);
});
test('HTTP mutations require canonical origin and reject cross-site requests',async()=>{
  const db=await database(),handler=createHandler(()=>db,env),token=await login(db);
  assert.equal((await handler(request('/api/tree',{action:'create',name:'我的'},token,{origin:'https://evil.example'}))).status,403);
  const missing=request('/api/tree',{action:'create',name:'我的'},token);missing.headers.delete('origin');assert.equal((await handler(missing)).status,403);
  assert.equal((await handler(new Request('https://evil.example/api/tree'))).status,403);
  assert.equal((await handler(request('/api/tree',{action:'create',name:'我的'},token))).status,200);
});
test('500 Chinese characters survive HTTP bounds and private data is never cached',async()=>{
  const db=await database(),handler=createHandler(()=>db,env),token=await login(db);
  const id=(await writeTree(db,'owner',{action:'create',name:'主人'})).id;
  const response=await handler(request('/api/tree',{action:'decorate',treeId:id,kind:0,slot:0,signature:'昵称',anonymous:true,body:'祝'.repeat(500)},token));assert.equal(response.status,200);
  const anonymous=await handler(request('/api/tree?id='+id));assert.equal(anonymous.headers.get('Cache-Control'),'private, no-store');assert.ok(!(await anonymous.text()).includes('祝'));
  assert.equal((await handler(request('/api/tree?id='+id+'&letters=1'))).status,401);
  const otherToken=await login(db,'b');assert.deepEqual((await (await handler(request('/api/tree?id='+id+'&letters=1',null,otherToken))).json()).letters,[]);
});
test('signed account restoration preserves the old tree and letters without giving others access',async()=>{
  const now=Date.now(),db=await database(),token=await login(db,'a',now);
  const id=(await writeTree(db,'old-owner',{action:'create',name:'原来的树'})).id;
  await writeTree(db,'friend',{action:'decorate',treeId:id,kind:0,slot:0,signature:'匿名',anonymous:true,body:'旧信'});
  await restoreAccount(db,request('/api/wechat',null,token),ticket('old-owner',now),secret,now);
  const session=await sessionFor(db,request('/api/tree',null,token),now);assert.equal(session.user_id,'old-owner');
  assert.equal((await readTree(db,session.user_id,null)).tree.id,id);assert.equal((await readTree(db,session.user_id,id,true)).letters[0].body,'旧信');
  const other=await login(db,'b',now);await assert.rejects(restoreAccount(db,request('/api/wechat',null,other),ticket('old-owner',now),secret,now),e=>e.status===409);
  assert.equal((await sessionFor(db,request('/api/tree',null,other),now)).user_id,'wx:b');
});
test('restoration rejects tampering, expiry, wrong audience, and merging existing new content',async()=>{
  const now=Date.now();
  assert.throws(()=>verifyMigrationTicket(ticket('owner',now)+'a',secret,now));
  assert.throws(()=>verifyMigrationTicket(ticket('owner',now,{aud:'https://evil.example'}),secret,now));
  assert.throws(()=>verifyMigrationTicket(ticket('owner',now),secret,now+300001));
  const db=await database(),token=await login(db,'a',now);
  await writeTree(db,'old-owner',{action:'create',name:'旧树'});
  await writeTree(db,'wx:a',{action:'create',name:'新树'});
  await assert.rejects(restoreAccount(db,request('/api/wechat',null,token),ticket('old-owner',now),secret,now),e=>e.status===409);
  assert.equal(Number((await db.sql.query('SELECT count(*) AS n FROM migration_receipts')).rows[0].n),0);
});
