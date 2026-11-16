import { test } from 'node:test';
import assert from 'node:assert/strict';
import { database } from './database.mjs';
import { createHandler } from '../lib/api.ts';
import { requestEmailCode, verifyEmailCode, normalizeEmail, saveProfile, profileFor } from '../lib/email-auth.ts';
import { SESSION_COOKIE, sessionFor } from '../lib/wechat-service.ts';
import { digest } from '../lib/wechat-crypto.ts';
import { SITE_ORIGIN } from '../lib/wechat-config.ts';
import { writeTree, readTree } from '../lib/tree-service.ts';
const secret='e'.repeat(64), now=Date.now();
const env={EMAIL_AUTH_SECRET:secret,SMTP_HOST:'test.invalid',SMTP_USER:'sender@example.com',SMTP_PASS:'test-only',EMAIL_LOGIN_ENABLED:'true'};
function req(token,data,path='/api/auth',origin=SITE_ORIGIN){return new Request(SITE_ORIGIN+path,{method:data?'POST':'GET',headers:{...(token?{cookie:`${SESSION_COOKIE}=${token}`} : {}),...(data?{origin,'content-type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});}
async function challenge(db,email='friend@example.com',options={},at=now){let code;const result=await requestEmailCode(db,req(options.token),{email,...options},secret,async(to,value)=>{assert.equal(to,normalizeEmail(email));code=value;},'test-client',at);return {...result,code};}
async function signin(db,email,at=now){const value=await challenge(db,email,{},at);return verifyEmailCode(db,req(),value,secret,at);}
async function legacy(db,subject='legacy'){const token=subject.padEnd(43,'a');await db.prepare('INSERT INTO wechat_accounts VALUES (?,?)').bind(subject,'wx:'+subject).run();await db.prepare('INSERT INTO wechat_sessions VALUES (?,?,?,?)').bind(digest(token),subject,now,now+3600000).run();return token;}

test('email login creates one identity, stores no raw address/code, and signs in again to the same tree',async()=>{
 const db=await database(),c=await challenge(db,' Friend@Example.com ');
 assert.match(c.code,/^\d{6}$/);
 const stored=JSON.stringify((await db.sql.query('SELECT * FROM email_login_challenges')).rows);
 assert.ok(!stored.includes('friend@example.com'));assert.ok(!stored.includes(`"${c.code}"`));
 const token=await verifyEmailCode(db,req(),c,secret,now),session=await sessionFor(db,req(token),now);
 await saveProfile(db,req(token),'小林');
 const tree=await writeTree(db,session.user_id,{action:'create',name:'小林'});
 const again=await signin(db,'friend@example.com',now+61000),second=await sessionFor(db,req(again),now+61000);
 assert.equal(session.user_id,second.user_id);assert.equal((await readTree(db,second.user_id,null)).tree.id,tree.id);
 assert.deepEqual(await profileFor(db,second),{name:'小林',emailLinked:true});
 await saveProfile(db,req(token),'新的昵称');assert.equal((await readTree(db,session.user_id,null)).tree.name,'新的昵称');
});
test('wrong code attempts persist, then lock; expired, undelivered, consumed and superseded codes fail',async()=>{
 const db=await database(),c=await challenge(db),wrong=c.code==='000000'?'000001':'000000';
 for(let i=0;i<5;i++)await assert.rejects(verifyEmailCode(db,req(),{...c,code:wrong},secret,now),e=>e.status===400);
 assert.equal((await db.sql.query('SELECT attempts FROM email_login_challenges')).rows[0].attempts,5);
 await assert.rejects(verifyEmailCode(db,req(),c,secret,now),e=>e.status===410);
 const second=await challenge(db,'second@example.com');await assert.rejects(verifyEmailCode(db,req(),second,secret,now+600000),e=>e.status===410);
 const third=await challenge(db,'third@example.com');const fourth=await challenge(db,'third@example.com',{},now+61000);
 await assert.rejects(verifyEmailCode(db,req(),third,secret,now+61000),e=>e.status===410);
 const results=await Promise.allSettled([verifyEmailCode(db,req(),fourth,secret,now+61000),verifyEmailCode(db,req(),fourth,secret,now+61000)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
});
test('SMTP failure cannot produce a usable login; malformed mailbox and rate limits prevent more sends',async()=>{
 const db=await database();let calls=0,failedCode;
 await assert.rejects(requestEmailCode(db,req(),{email:'fail@example.com'},secret,async(_,code)=>{calls++;failedCode=code;throw new Error('private SMTP details');},'client',now),e=>e.status===503);
 const row=(await db.sql.query('SELECT * FROM email_login_challenges')).rows[0];assert.ok(row.consumed_at);assert.equal(row.delivered,false);
 await assert.rejects(verifyEmailCode(db,req(),{challengeId:row.id,code:failedCode},secret,now),e=>e.status===410);
 await assert.rejects(requestEmailCode(db,req(),{email:'fail@example.com'},secret,async()=>{calls++;},'other',now+100),e=>e.status===429);assert.equal(calls,1);
 for(const email of ['missing-at','a@example.com\r\nBcc:evil@example.com','.a@example.com','a..b@example.com'])assert.throws(()=>normalizeEmail(email));
 for(let i=0;i<20;i++)await challenge(db,`ip${i}@example.com`);
 await assert.rejects(challenge(db,'one-too-many@example.com'),e=>e.status===429);
});
test('verified email binds to the existing account and preserves its tree, letters, and one-gift limit',async()=>{
 const db=await database(),old=await legacy(db),tree=(await writeTree(db,'wx:legacy',{action:'create',name:'原来的主人'})).id;
 const otherTree=(await writeTree(db,'another-owner',{action:'create',name:'朋友'})).id;
 await writeTree(db,'wx:legacy',{action:'decorate',treeId:otherTree,kind:0,slot:0,signature:'旧署名',anonymous:false,body:'旧信'});
 await writeTree(db,'friend',{action:'decorate',treeId:tree,kind:1,slot:1,signature:'朋友',anonymous:true,body:'只给主人看'});
 const c=await challenge(db,'bound@example.com',{token:old,linkCurrent:true});
 await assert.rejects(verifyEmailCode(db,req(),c,secret,now),e=>e.status===401);
 const fresh=await verifyEmailCode(db,req(old),c,secret,now),session=await sessionFor(db,req(fresh),now);
 assert.equal(session.user_id,'wx:legacy');assert.equal((await readTree(db,session.user_id,null)).tree.id,tree);
 assert.equal((await readTree(db,session.user_id,tree,true)).letters[0].body,'只给主人看');
 await writeTree(db,session.user_id,{action:'decorate',treeId:otherTree,kind:2,slot:2,signature:'新署名',anonymous:false,body:'新信'});
 assert.equal((await readTree(db,session.user_id,otherTree)).gifts.length,1);
 const emailOnly=await signin(db,'bound@example.com',now+61000);assert.equal((await sessionFor(db,req(emailOnly),now+61000)).user_id,'wx:legacy');
 const stranger=await signin(db,'stranger@example.com');assert.deepEqual((await readTree(db,(await sessionFor(db,req(stranger),now)).user_id,tree,true)).letters,[]);
 const publicTree=JSON.stringify(await readTree(db,null,tree));assert.ok(!publicTree.includes('只给主人看'));assert.ok(!publicTree.includes('bound@example.com'));
});
test('email already owned by another identity never merges accounts; binding requires the initiating session',async()=>{
 const db=await database(),first=await signin(db,'claimed@example.com'),old=await legacy(db);
 const c=await challenge(db,'claimed@example.com',{token:old,linkCurrent:true},now+61000);
 await assert.rejects(verifyEmailCode(db,req(old),c,secret,now+61000),e=>e.status===409);
 assert.notEqual((await sessionFor(db,req(first),now)).user_id,(await sessionFor(db,req(old),now)).user_id);
 const newer=await legacy(db,'different');const pending=await challenge(db,'pending@example.com',{token:old,linkCurrent:true});
 await assert.rejects(verifyEmailCode(db,req(newer),pending,secret,now),e=>e.status===401);
});
test('HTTP email authentication needs same origin, has secure cookies, and logout revokes access',async()=>{
 let calls=0;const anonymous=createHandler(()=>{calls++;throw new Error('db called');},env,async()=>{});
 assert.equal((await (await anonymous(req())).json()).available,true);assert.equal(calls,0);
 const db=await database();let code;const handler=createHandler(()=>db,env,async(_,value)=>{code=value;});
 assert.equal((await handler(req(null,{action:'request-code',email:'test@example.com'},'/api/auth','https://evil.example'))).status,403);
 assert.equal((await handler(req(null,{action:'profile',name:'冒充'}))).status,401);
 const sent=await (await handler(req(null,{action:'request-code',email:'test@example.com'}),'trusted-platform-ip')).json();
 const response=await handler(req(null,{action:'verify-code',challengeId:sent.challengeId,code}));assert.equal(response.status,200);
 const cookie=response.headers.get('set-cookie');assert.match(cookie,/Secure; HttpOnly; SameSite=Lax/);const token=cookie.split(';')[0].split('=')[1];
 assert.equal((await (await handler(req(token))).json()).signedIn,true);
 await handler(req(token,{action:'profile',name:'朋友'}));assert.equal((await (await handler(req(token))).json()).name,'朋友');
 await handler(req(token,{action:'logout'}));assert.equal((await (await handler(req(token))).json()).signedIn,false);
});
