import { scenes, statDefinitions } from './story.js';

export const SAVE_VERSION = 1;
export const TRAVEL_DURATION = 4000;
export const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export function createState(seed, preferences = {}) {
  return {
    version: SAVE_VERSION, sceneIndex: 0, phase: 'choice', speed: 1, paused: false, travelProgress: 0,
    rng: (seed >>> 0) || 0x6d2b79f5,
    stats: { health: 70, mental: 65, wealth: 40, connections: 25, reputation: 20 },
    records: [], result: null,
    preferences: { name: preferences.name || '이름 없는 여행자', fontSize: preferences.fontSize === 'large' ? 'large' : 'normal' }
  };
}

export function rollPercent(seed) {
  let x = seed >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  const nextSeed = x >>> 0;
  return { roll: nextSeed / 0x100000000 * 100, nextSeed };
}

export function choiceSucceeds(chance, roll) {
  if (!Number.isFinite(chance) || !Number.isFinite(roll) || roll < 0 || roll >= 100) throw new Error('Invalid probability');
  return roll < clamp(Math.round(chance));
}

export function resolveChoice(state, choiceId) {
  if (state.phase !== 'choice') return state;
  const scene = scenes[state.sceneIndex];
  const choice = scene.choices.find(item => item.id === choiceId);
  if (!choice) return state;
  const chance = clamp(Math.round(choice.chance));
  const { roll, nextSeed } = rollPercent(state.rng);
  const succeeded = choiceSucceeds(chance, roll);
  const outcome = succeeded ? choice.success : choice.failure;
  const nextStats = { ...state.stats };
  const effects = {};
  for (const { key } of statDefinitions) {
    nextStats[key] = clamp(state.stats[key] + (outcome.effects[key] || 0));
    if (nextStats[key] !== state.stats[key]) effects[key] = nextStats[key] - state.stats[key];
  }
  const record = { sceneId: scene.id, title: scene.title, day: scene.day, time: scene.time, label: choice.label, chance, succeeded, text: outcome.text, effects };
  return { ...state, stats: nextStats, rng: nextSeed, phase: 'result', travelProgress: 0, result: record, records: [...state.records, record] };
}

export function continueStory(state) {
  if (state.phase !== 'result') return state;
  if (state.sceneIndex === scenes.length - 1 || state.stats.health <= 0) return { ...state, phase: 'ending', paused: false };
  return { ...state, phase: 'travelling', paused: false, travelProgress: 0 };
}

export function advanceTime(state, elapsedMs) {
  if (state.phase !== 'travelling' || state.paused) return state;
  const travelProgress = Math.min(TRAVEL_DURATION, state.travelProgress + Math.max(0, elapsedMs) * state.speed);
  if (travelProgress < TRAVEL_DURATION) return { ...state, travelProgress };
  return { ...state, sceneIndex: state.sceneIndex + 1, phase: 'choice', result: null, travelProgress: 0, paused: false };
}

export function validSave(data) {
  if (!data || data.version !== SAVE_VERSION) return false;
  if (!Number.isInteger(data.sceneIndex) || data.sceneIndex < 0 || data.sceneIndex >= scenes.length) return false;
  if (!['choice', 'result', 'travelling', 'ending'].includes(data.phase) || ![1, 2, 4].includes(data.speed) || typeof data.paused !== 'boolean') return false;
  if (!Number.isInteger(data.rng) || data.rng < 1 || data.rng > 0xffffffff || !Number.isFinite(data.travelProgress) || data.travelProgress < 0 || data.travelProgress > TRAVEL_DURATION) return false;
  if (!data.stats || !statDefinitions.every(({ key }) => Number.isInteger(data.stats[key]) && data.stats[key] >= 0 && data.stats[key] <= 100)) return false;
  if (!data.preferences || typeof data.preferences.name !== 'string' || data.preferences.name.length > 20 || !['normal', 'large'].includes(data.preferences.fontSize)) return false;
  if (!Array.isArray(data.records) || data.records.length > scenes.length) return false;
  const expectedRecords = data.phase === 'choice' ? data.sceneIndex : data.sceneIndex + 1;
  if (data.records.length !== expectedRecords) return false;
  if (data.phase === 'travelling' && data.sceneIndex >= scenes.length - 1) return false;
  if (data.phase === 'ending' && data.sceneIndex !== scenes.length - 1 && data.stats.health > 0) return false;
  if (!data.records.every((record, index) => {
    const scene = scenes[index];
    const choice = scene.choices.find(item => item.label === record?.label);
    return record && record.sceneId === scene.id && record.title === scene.title && record.day === scene.day && record.time === scene.time && choice && record.chance === choice.chance && typeof record.succeeded === 'boolean' && typeof record.text === 'string' && record.text.length < 1000 && record.effects && Object.entries(record.effects).every(([key, value]) => statDefinitions.some(stat => stat.key === key) && Number.isInteger(value) && Math.abs(value) <= 100);
  })) return false;
  if (data.phase === 'choice') return data.result === null;
  return JSON.stringify(data.result) === JSON.stringify(data.records.at(-1));
}
