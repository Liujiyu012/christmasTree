import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveLocale,translate} from '../lib/i18n.ts';
import {EN} from '../lib/translations.ts';
import {SHAPES,TOPPERS,BASES} from '../lib/tree-design.ts';

test('explicit language wins; supported browser preferences are resolved in order',()=>{
  assert.equal(resolveLocale('zh',['en-US']),'zh');
  assert.equal(resolveLocale('en',['zh-TW']),'en');
  assert.equal(resolveLocale(null,['fr-FR','en-GB','zh-CN']),'en');
  assert.equal(resolveLocale('invalid',['zh-HK','en-US']),'zh');
  assert.equal(resolveLocale(null,['de-DE']),'zh');
});

test('localized sentences preserve names and do not recursively substitute user text',()=>{
  const name='小林 {count} <Alex> $&';
  assert.equal(translate('en','{name}的圣诞树',{name}),name+'’s Christmas tree');
  assert.equal(translate('zh','{name}的圣诞树',{name}),name+'的圣诞树');
  assert.equal(translate('en','未知内容'),'未知内容');
  assert.equal(translate('en','constructor'),'constructor');
  assert.equal(translate('en','圣诞树，已挂 {count} 件装饰，共 30 个位置',{count:0}),'Christmas tree with 0 ornaments and 30 places');
});

test('all custom tree choices are localized without changing their stored IDs',()=>{
  for(const label of [...SHAPES,...TOPPERS,...BASES]){
    assert.ok(EN[label]);assert.doesNotMatch(translate('en',label),/\p{Script=Han}/u);
    assert.equal(translate('zh',label),label);
  }
});

test('translated sentences retain all interpolation fields',()=>{
  const fields=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
  for(const [source,english] of Object.entries(EN))assert.deepEqual(fields(source),fields(english),source);
});
