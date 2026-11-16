import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canShareImage,shareImage} from '../lib/card-save.ts';
const file=new File([new Uint8Array([137,80,78,71])],'winter-letter.png',{type:'image/png'});
test('shares the prepared PNG synchronously from the tap, with no private public URL',async()=>{
 let received;
 const navigator={canShare:({files})=>files[0]===file,share:data=>{received=data;return Promise.resolve();}};
 const pending=shareImage(navigator,file);
 assert.deepEqual(received,{files:[file]});assert.equal(await pending,'shared');
});
test('unsupported file sharing falls back without opening a download or sharing a URL',async()=>{
 let calls=0;
 for(const navigator of [{},{share:async()=>calls++},{canShare:()=>false,share:async()=>calls++},{canShare:()=>{throw Error('restricted');},share:async()=>calls++}]){
  assert.equal(canShareImage(navigator,file),false);assert.equal(await shareImage(navigator,file),'fallback');
 }
 assert.equal(calls,0);
});
test('cancelling the share sheet never triggers a download or error fallback',async()=>{
 const navigator={canShare:()=>true,share:async()=>{throw new DOMException('Cancelled','AbortError');}};
 assert.equal(await shareImage(navigator,file),'cancelled');
});
test('a denied native share gives the user an inline image fallback',async()=>{
 const navigator={canShare:()=>true,share:async()=>{throw new DOMException('Blocked','NotAllowedError');}};
 assert.equal(await shareImage(navigator,file),'fallback');
});
