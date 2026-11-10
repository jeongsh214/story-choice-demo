import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, choiceSucceeds, resolveChoice, continueStory, advanceTime, validSave, TRAVEL_DURATION } from '../engine.js';
import { scenes } from '../story.js';

test('표시되는 확률의 경계와 0%·100% 판정이 정확하다', () => {
  assert.equal(choiceSucceeds(0, 0), false);
  assert.equal(choiceSucceeds(100, 99.999), true);
  assert.equal(choiceSucceeds(80, 79.999), true);
  assert.equal(choiceSucceeds(80, 80), false);
  assert.equal(choiceSucceeds(50, 50), false);
});
test('한 선택은 한 번만 처리되며 저장 복원으로 결과가 바뀌지 않는다', () => {
  const state = createState(12345);
  const result = resolveChoice(state, 'two');
  assert.equal(result.records.length, 1);
  assert.equal(result.result.chance, 50);
  assert.equal(validSave(result), true);
  assert.deepEqual(resolveChoice(JSON.parse(JSON.stringify(state)), 'two'), result);
  assert.equal(resolveChoice(result, 'one'), result);
  assert.equal(validSave(JSON.parse(JSON.stringify(result))), true);
});
test('결과가 성공일 때와 실패일 때 서로 다른 효과가 적용된다', () => {
  const outcomes = new Map();
  for (let seed = 1000; seed < 50000 && outcomes.size < 2; seed += 1000) {
    const result = resolveChoice(createState(seed), 'two');
    outcomes.set(result.result.succeeded, result);
  }
  assert.equal(outcomes.size, 2);
  assert.equal(outcomes.get(true).stats.wealth, 54);
  assert.equal(outcomes.get(false).stats.wealth, 35);
});
test('쉬어 가는 선택은 항상 성공하며 능력치는 0~100 안에서 유지된다', () => {
  const state = createState(13579);
  state.stats.health = 99; state.stats.mental = 99; state.stats.wealth = 1;
  const result = resolveChoice(state, 'three');
  assert.equal(result.result.succeeded, true);
  assert.equal(result.stats.health, 100);
  assert.equal(result.stats.mental, 100);
  assert.equal(result.stats.wealth, 0);
  assert.deepEqual(result.result.effects, { health: 1, mental: 1, wealth: -1 });
});
test('선택·결과 중에는 시간이 멈추고 배속·일시정지가 실제 진행에 반영된다', () => {
  const state = createState(42);
  assert.equal(advanceTime(state, 10000), state);
  const result = resolveChoice(state, 'one');
  assert.equal(advanceTime(result, 10000), result);
  const travel = { ...continueStory(result), speed: 2 };
  assert.equal(advanceTime(travel, 1000).travelProgress, 2000);
  const paused = { ...travel, paused: true };
  assert.equal(advanceTime(paused, 10000), paused);
  const next = advanceTime(travel, TRAVEL_DURATION / 2);
  assert.equal(next.phase, 'choice'); assert.equal(next.sceneIndex, 1);
  assert.equal(validSave(next), true);
});
test('모든 사건이 엔딩으로 이어지고 각 단계의 저장 상태가 유효하다', () => {
  let state = createState(54321);
  for (let index = 0; index < scenes.length; index++) {
    assert.equal(state.sceneIndex, index);
    assert.equal(validSave(state), true);
    state = resolveChoice(state, 'three');
    assert.equal(validSave(state), true);
    state = continueStory(state);
    assert.equal(validSave(state), true);
    state = advanceTime(state, TRAVEL_DURATION);
  }
  assert.equal(state.phase, 'ending'); assert.equal(state.records.length, 5);
});
test('깨진 저장 파일과 스토리 범위를 벗어난 진행은 거부한다', () => {
  const state = createState(888);
  assert.equal(validSave(null), false);
  assert.equal(validSave({ ...state, version: 999 }), false);
  assert.equal(validSave({ ...state, sceneIndex: 500 }), false);
  assert.equal(validSave({ ...state, rng: 0 }), false);
  assert.equal(validSave({ ...state, stats: { ...state.stats, health: '70' } }), false);
  assert.equal(validSave({ ...state, phase: 'ending' }), false);
  const result = resolveChoice(state, 'one');
  assert.equal(validSave({ ...result, records: [] }), false);
});
