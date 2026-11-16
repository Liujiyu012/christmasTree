import test from 'node:test';
import assert from 'node:assert/strict';
import {getSky} from '../lib/christmas-sky.ts';
const at = (hour, minute=0) => new Date(2026, 11, 24, hour, minute);
test('storybook sky follows local hours and wraps overnight', () => {
  for (const [hour, phase] of [[0,'night'],[4,'night'],[9,'day'],[14,'day'],[17,'sunset'],[19,'dusk'],[22,'night'],[23,'night']]) {
    assert.equal(getSky(at(hour)).phase, phase);
  }
  assert.deepEqual(getSky(at(0)).weights, getSky(at(23,59)).weights);
});
test('all times have a bounded, normalized blend and continuous transitions', () => {
  let previous=getSky(at(0));
  for (let minute=1; minute<1440; minute++) {
    const current=getSky(at(Math.floor(minute/60),minute%60));
    const weights=Object.values(current.weights);
    assert.ok(weights.every(value=>value>=0&&value<=1));
    assert.ok(Math.abs(weights.reduce((sum,value)=>sum+value,0)-1)<1e-9);
    for (const phase of Object.keys(current.weights)) assert.ok(Math.abs(current.weights[phase]-previous.weights[phase])<.02);
    assert.ok(current.stars>=0&&current.stars<=1);
    previous=current;
  }
});
test('preview overrides time while automatic mode returns to current local time', () => {
  for (const phase of ['day','sunset','dusk','night']) {
    const sky=getSky(at(9),phase);
    assert.equal(sky.phase,phase);
    assert.equal(sky.weights[phase],1);
  }
  assert.equal(getSky(at(9),'auto').phase,'day');
  assert.equal(getSky(at(9),'day').stars,0);
  assert.equal(getSky(at(9),'night').stars,1);
});
