import { test } from 'node:test';
import assert from 'node:assert/strict';
import { database } from './database.mjs';
import { decryptMessage, digest, encryptReply, signature, verifySignature, xmlField } from '../lib/wechat-crypto.ts';
import { consumeLogin, cookie, receiveMessage, revokeSession, safeReturn, SESSION_COOKIE, SESSION_SECONDS, sessionFor, verifyWebhook } from '../lib/wechat-service.ts';
import { limitedText, sameOriginJSON } from '../lib/wechat-http.ts';
import { wechatConfig, SITE_ORIGIN } from '../lib/wechat-config.ts';
import { readTree, writeTree } from '../lib/tree-service.ts';

// Public fixtures, including the known-answer vector in WeChat's encryption guide.
const config = { appId:'wxba5fad812f8e6fb9', token:'AAAAA', aesKey:'A'.repeat(43), enabled:true, visible:false, accountName:'测试公众号', accountId:'example', qrPath:null };
const now = 1794690000000;
function incoming(sender='openid_alice', msgId='100', content='登录', at=now) {
  const xml=`<xml><ToUserName>gh_example</ToUserName><FromUserName>${sender}</FromUserName><CreateTime>${Math.floor(at/1000)}</CreateTime><MsgType>text</MsgType><Content><![CDATA[${content}]]></Content><MsgId>${msgId}</MsgId></xml>`;
  const body=encryptReply(xml,config,'nonce123',at),encrypted=xmlField(body,'Encrypt');
  const params=new URLSearchParams({timestamp:String(Math.floor(at/1000)),nonce:'nonce123',encrypt_type:'aes',msg_signature:signature(config.token,String(Math.floor(at/1000)),'nonce123',encrypted)});
  return {body,params};
}
async function issue(db,sender='openid_alice',msgId='100',at=now){
  const {body,params}=incoming(sender,msgId,'登录',at);
  const result=await receiveMessage(db,config,params,body,at);
  const message=decryptMessage(xmlField(result,'Encrypt'),config);
  assert.match(message,/不需要关注公众号/);
  return message.match(/#ticket=([\w-]{43})/)[1];
}
const request=token=>new Request(SITE_ORIGIN+'/api/tree',{headers:{cookie:`${SESSION_COOKIE}=${token}`}});
const gift=treeId=>({action:'decorate',treeId,kind:0,slot:0,signature:'小鹿',anonymous:true,body:'私密祝福'});

test('decrypts the official known-answer vector and checks the receiving AppID',()=>{
  const encrypted='+qdx1OKCy+5JPCBFWw70tm0fJGb2Jmeia4FCB7kao+/Q5c/ohsOzQHi8khUOb05JCpj0JB4RvQMkUyus8TPxLKJGQqcvZqzDpVzazhZv6JsXUnnR8XGT740XgXZUXQ7vJVnAG+tE8NUd4yFyjPy7GgiaviNrlCTj+l5kdfMuFUPpRSrfMZuMcp3Fn2Pede2IuQrKEYwKSqFIZoNqJ4M8EajAsjLY2km32IIjdf8YL/P50F7mStwntrA2cPDrM1kb6mOcfBgRtWygb3VIYnSeOBrebufAlr7F9mFUPAJGj04=';
  const value=JSON.parse(decryptMessage(encrypted,config));
  assert.equal(value.debug_str,'hello world');assert.equal(value.FromUserName,'o9AgO5Kd5ggOC-bXrbNODIiE3bGY');
  assert.equal(signature('AAAAA','1714112445','415670741',encrypted),'046e02f8204d34f8ba5fa3b1db94908f3df2e9b3');
  assert.throws(()=>decryptMessage(encrypted,{...config,appId:'wx0000000000000000'}),e=>e.status===403);
  assert.throws(()=>decryptMessage(encrypted.slice(0,-8)+'AAAAAAAA',config),e=>e.status===403);
});
test('verifies both webhook challenge formats and rejects old or forged signatures',()=>{
  const timestamp=String(now/1000),nonce='nonce123',params=new URLSearchParams({timestamp,nonce,echostr:'hello',signature:signature(config.token,timestamp,nonce)});
  assert.equal(verifyWebhook(config,params,now),'hello');
  assert.throws(()=>verifyWebhook(config,params,now+301000),e=>e.status===403);
  params.set('signature','0'.repeat(40));assert.throws(()=>verifyWebhook(config,params,now),e=>e.status===403);
  const encrypted=xmlField(encryptReply('challenge',config,nonce,now),'Encrypt');
  params.set('echostr',encrypted);params.set('msg_signature',signature(config.token,timestamp,nonce,encrypted));
  assert.equal(verifyWebhook(config,params,now),'challenge');
});
test('rejects unverified/plaintext messages, malformed XML, and ignores unrelated messages',async()=>{
  const db=await database(),message=incoming();message.params.set('msg_signature','0'.repeat(40));
  await assert.rejects(receiveMessage(db,config,message.params,message.body,now),e=>e.status===403);
  await assert.rejects(receiveMessage(db,config,new URLSearchParams(),'<xml><Content>登录</Content></xml>',now),e=>e.status===403);
  for(const xml of ['<xml><Encrypt>x</Encrypt><Encrypt>y</Encrypt></xml>','<!DOCTYPE xml [<!ENTITY x SYSTEM "file:///etc/passwd">]><xml><Encrypt>&x;</Encrypt></xml>'])assert.throws(()=>xmlField(xml,'Encrypt'),e=>e.status===403);
  const other=incoming('openid_alice','101','你好');assert.equal(await receiveMessage(db,config,other.params,other.body,now),'success');
  assert.equal(Number((await db.sql.query('SELECT count(*) AS n FROM wechat_accounts')).rows[0].n),0);
});
test('does not require follow status; retries preserve a one-use token and only hashes are stored',async()=>{
  const db=await database(),token=await issue(db);assert.equal(await issue(db),token);
  const row=(await db.sql.query('SELECT * FROM wechat_login_tokens')).rows[0];assert.equal(row.token_hash,digest(token));assert.ok(!JSON.stringify(row).includes(token));
  const session=await consumeLogin(db,token,now);const user=await sessionFor(db,request(session),now);
  assert.match(user.user_id,/^wx:/);assert.ok(!user.user_id.includes('openid_alice'));
  await issue(db);await assert.rejects(consumeLogin(db,token,now),e=>e.status===410);
  assert.equal(await sessionFor(db,request('openid_alice'),now),null);
});
test('both common Chinese login spellings issue usable links for the same account',async()=>{
  const db=await database(),users=[];
  for(const [i,content] of ['登录','登陆',' \n登陆\n '].entries()){
    const {body,params}=incoming('openid_alice',String(200+i),content);
    const reply=await receiveMessage(db,config,params,body,now);
    const decrypted=decryptMessage(xmlField(reply,'Encrypt'),config);
    const token=decrypted.match(/#ticket=([\w-]{43})/)[1];
    users.push((await sessionFor(db,request(await consumeLogin(db,token,now)),now)).user_id);
    await assert.rejects(consumeLogin(db,token,now),e=>e.status===410);
  }
  assert.equal(new Set(users).size,1);
  assert.equal(Number((await db.sql.query('SELECT count(*) AS n FROM wechat_accounts')).rows[0].n),1);
  const unrelated=incoming('openid_other','300','登陆成功了吗');
  assert.equal(await receiveMessage(db,config,unrelated.params,unrelated.body,now),'success');
  assert.equal(Number((await db.sql.query('SELECT count(*) AS n FROM wechat_accounts')).rows[0].n),1);
});
test('expired links fail and two exchanges cannot both create sessions',async()=>{
  const db=await database(),token=await issue(db);
  await assert.rejects(consumeLogin(db,token,now+300000),e=>e.status===410);
  const result=await Promise.allSettled([consumeLogin(db,token,now),consumeLogin(db,token,now)]);
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(Number((await db.sql.query('SELECT count(*) AS n FROM wechat_sessions')).rows[0].n),1);
});
test('login exchange rolls back if token consumption fails',async()=>{
  const db=await database(),token=await issue(db);
  await db.sql.exec("CREATE FUNCTION reject_consume() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$; CREATE TRIGGER reject_consume BEFORE UPDATE ON wechat_login_tokens FOR EACH ROW EXECUTE FUNCTION reject_consume();");
  await assert.rejects(consumeLogin(db,token,now));assert.equal(Number((await db.sql.query('SELECT count(*) AS n FROM wechat_sessions')).rows[0].n),0);
});
test('sessions expire and logout revokes them; cookies are secure and not readable by JS',async()=>{
  const db=await database(),session=await consumeLogin(db,await issue(db),now);
  assert.ok(await sessionFor(db,request(session),now));
  assert.equal(await sessionFor(db,request(session),now+SESSION_SECONDS*1000),null);
  const setCookie=cookie(SESSION_COOKIE,session,SESSION_SECONDS);for(const flag of ['Secure','HttpOnly','SameSite=Lax','Path=/'])assert.ok(setCookie.includes(flag));
  await revokeSession(db,request(session));assert.equal(await sessionFor(db,request(session),now),null);
});
test('same WeChat on two devices has one ornament; letters remain owner/sender-only',async()=>{
  const db=await database(),owner=(await writeTree(db,'owner',{action:'create',name:'小悟'})).id;
  const a=await sessionFor(db,request(await consumeLogin(db,await issue(db),now)),now);
  const b=await sessionFor(db,request(await consumeLogin(db,await issue(db,'openid_alice','101'),now)),now);
  assert.equal(a.user_id,b.user_id);await writeTree(db,a.user_id,gift(owner));await writeTree(db,b.user_id,{...gift(owner),slot:3});
  assert.equal((await readTree(db,null,owner)).gifts.length,1);assert.equal((await readTree(db,'stranger',owner,true)).letters.length,0);
  assert.equal((await readTree(db,b.user_id,owner,true)).letters[0].body,'私密祝福');assert.equal((await readTree(db,'owner',owner,true)).letters[0].body,'私密祝福');
});
test('mutations reject cross-site, missing-Origin, non-JSON and oversized requests',async()=>{
  const req=(origin,type='application/json',body='{}')=>new Request(SITE_ORIGIN+'/api/wechat',{method:'POST',headers:{...(origin?{origin}:{}),'content-type':type},body});
  for(const r of [req('https://evil.example'),req(null),req(SITE_ORIGIN,'text/plain'),req(SITE_ORIGIN,'application/json','x'.repeat(9000)),req(SITE_ORIGIN,'application/json','[]')])await assert.rejects(sameOriginJSON(r));
  assert.deepEqual(await sameOriginJSON(req(SITE_ORIGIN)),{});
  await assert.rejects(limitedText(req(SITE_ORIGIN,'text/plain','x'.repeat(100)),50),e=>e.status===413);
});
test('return paths cannot redirect off-site and missing config cannot enable the entry',()=>{
  for(const id of ['//evil.example','https://evil.example','../callback',null])assert.equal(safeReturn(id),'/');
  assert.equal(safeReturn('12345678-1234-1234-1234-123456789abc'),'/?tree=12345678-1234-1234-1234-123456789abc');
  assert.equal(wechatConfig({WECHAT_LOGIN_ENABLED:'true'}),null);
  const value=wechatConfig({WECHAT_APP_ID:config.appId,WECHAT_TOKEN:config.token,WECHAT_ENCODING_AES_KEY:config.aesKey,WECHAT_ACCOUNT_NAME:'测试',WECHAT_ACCOUNT_ID:'test',WECHAT_LOGIN_ENABLED:'true',WECHAT_QR_PATH:'https://evil.example/qr.png'});
  assert.equal(value.enabled,true);assert.equal(value.visible,false);assert.equal(value.qrPath,null);
  assert.equal(wechatConfig({WECHAT_APP_ID:config.appId,WECHAT_TOKEN:config.token,WECHAT_ENCODING_AES_KEY:'A'.repeat(42)+'+'}),null);
});
