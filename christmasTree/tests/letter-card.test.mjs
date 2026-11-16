import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wrapLetter} from '../lib/letter-card.ts';
test('long Chinese text and unbroken URLs keep every character while wrapping',()=>{
 for(const text of ['祝你圣诞快乐'.repeat(80),'https://example.com/'+'a'.repeat(300)]) {
  const rows=wrapLetter(text,s=>Array.from(s).length,24);
  assert.equal(rows.join(''),text);assert(rows.every(row=>Array.from(row).length<=24));
 }
});
test('newlines and joined emoji are preserved in letter cards',()=>{
 const text='第一行\n\n第二行👨‍👩‍👧‍👦❤️\n最后一行';
 assert.deepEqual(wrapLetter(text,s=>s.length,100),text.split('\n'));
 assert.deepEqual(wrapLetter('👨‍👩‍👧‍👦👨‍👩‍👧‍👦',s=>s.length,12),['👨‍👩‍👧‍👦','👨‍👩‍👧‍👦']);
});
