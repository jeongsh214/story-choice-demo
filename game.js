import { scenes, statDefinitions } from './story.js';
import { createState, resolveChoice, continueStory, advanceTime, validSave, TRAVEL_DURATION } from './engine.js';

const SAVE_KEY = 'oneday-story-save-v1';
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
let state;
let storageAvailable = true;
let recoveredSave = false;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (validSave(parsed)) { state = parsed; recoveredSave = true; }
  }
} catch { storageAvailable = false; }
state ||= createState(newSeed());

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); storageAvailable = true; }
  catch { storageAvailable = false; }
  $('save-indicator').classList.toggle('save-unavailable', !storageAvailable);
  $('save-indicator').innerHTML = `<span class="status-dot"></span>${storageAvailable ? '이 브라우저에 자동 저장' : '저장 불가 · 현재 플레이만 유지'}`;
}

function commit(next, { focus = false } = {}) {
  if (next === state) return;
  state = next;
  save();
  render();
  if (focus) $('event-title').focus({ preventScroll: true });
}

function effectChips(effects) {
  return Object.entries(effects).map(([key, value]) => {
    const stat = statDefinitions.find(item => item.key === key);
    return `<span class="effect-chip ${value > 0 ? 'positive' : 'negative'}">${stat.label} ${value > 0 ? '+' : '−'}${Math.abs(value)}</span>`;
  }).join('');
}

function renderStats() {
  $('stats').innerHTML = statDefinitions.map(({ key, label, color }) => `<div class="stat-row"><div class="stat-label"><span>${label}</span><strong>${state.stats[key]}<small> / 100</small></strong></div><div class="stat-track" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${state.stats[key]}"><div style="width:${state.stats[key]}%;background:${color}"></div></div></div>`).join('');
  $('choice-count').textContent = `${state.records.length} / ${scenes.length}`;
  $('success-count').textContent = state.records.filter(record => record.succeeded).length;
  $('journey-dots').innerHTML = scenes.map((scene, index) => `<span class="journey-dot ${index < state.records.length ? (state.records[index].succeeded ? 'completed' : 'missed') : index === state.sceneIndex ? 'current' : ''}" title="${index + 1}번째 선택"></span>`).join('');
}

function renderPlayback() {
  const travelling = state.phase === 'travelling';
  $('pause-button').disabled = !travelling;
  $('pause-button').textContent = travelling ? (state.paused ? '▶ 계속' : 'Ⅱ 일시정지') : '시간 정지';
  $('phase-indicator').textContent = { choice: '선택 대기 · 시간 정지', result: '결과 확인 · 시간 정지', travelling: state.paused ? '일시정지' : '시간이 흐르는 중', ending: '이야기 완료' }[state.phase];
  $('phase-indicator').classList.toggle('is-running', travelling && !state.paused);
  document.querySelectorAll('[data-speed]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === state.speed)));
  renderProgress();
}

function renderProgress() {
  const percent = state.records.length / scenes.length * 100;
  $('time-progress').style.width = `${percent}%`;
  $('travel-progress').style.width = `${state.travelProgress / TRAVEL_DURATION * 100}%`;
  $('travel-message').textContent = state.paused ? '잠시 멈췄습니다. 계속 버튼이나 Space 키로 이어가세요.' : `다음 기록까지 ${Math.max(1, Math.ceil((TRAVEL_DURATION - state.travelProgress) / state.speed / 1000))}초`;
}

function renderHistory() {
  $('record-count').textContent = `${state.records.length}개의 기록`;
  if (!state.records.length) {
    $('history').innerHTML = '<div class="history-empty"><span aria-hidden="true">│</span><p>아직 기록이 없습니다.<br><small>첫 번째 선택으로 이야기를 시작해 보세요.</small></p></div>';
    return;
  }
  $('history').innerHTML = [...state.records].reverse().map(record => `<article class="history-item"><div class="history-node ${record.succeeded ? 'success' : 'failure'}"></div><div class="history-item-content"><div class="history-item-top"><span>${record.day}일차 · ${escapeHTML(record.time)}</span><span class="history-result ${record.succeeded ? 'success' : 'failure'}">${record.succeeded ? '성공' : '실패'}</span></div><h4>${escapeHTML(record.title)} <span>— ${escapeHTML(record.label)}</span></h4><p>${escapeHTML(record.text)}</p><div class="history-effects">${effectChips(record.effects)}</div></div></article>`).join('');
}

function render() {
  const scene = scenes[state.sceneIndex];
  document.documentElement.dataset.fontSize = state.preferences.fontSize;
  $('character-name').textContent = state.preferences.name;
  $('day-label').textContent = `${scene.day}일차`;
  $('time-label').textContent = scene.time;
  $('chapter-label').textContent = `CHAPTER ${String(state.sceneIndex + 1).padStart(2, '0')}`;
  $('episode-label').textContent = `${scene.label} / 총 ${scenes.length}장면`;
  $('event-kicker').textContent = scene.kicker;
  $('event-title').textContent = scene.title;
  $('event-body').innerHTML = scene.paragraphs.map(text => `<p>${escapeHTML(text)}</p>`).join('');
  $('event-section').hidden = state.phase === 'ending';
  $('choices-section').hidden = state.phase !== 'choice';
  $('result-panel').hidden = state.phase !== 'result';
  $('travel-panel').hidden = state.phase !== 'travelling';
  $('ending-panel').hidden = state.phase !== 'ending';

  if (state.phase === 'choice') {
    $('choices').innerHTML = scene.choices.map((choice, index) => `<button class="choice-button ${choice.tone}" type="button" data-choice="${choice.id}" aria-label="${choice.label}, 성공 확률 ${choice.chance}%"><span class="choice-number">${String(index + 1).padStart(2, '0')}</span><span class="choice-copy"><strong>${choice.label}</strong><span>${escapeHTML(choice.description)}</span></span><span class="chance"><small>성공 확률</small><strong>${choice.chance}<span>%</span></strong></span></button>`).join('');
  }
  if (state.phase === 'result') {
    const result = state.result;
    $('result-panel').innerHTML = `<div class="result-heading ${result.succeeded ? 'success' : 'failure'}"><span class="result-symbol" aria-hidden="true">${result.succeeded ? '✧' : '◇'}</span><span class="eyebrow">${escapeHTML(result.label)} · 성공 확률 ${result.chance}%</span></div><h3 id="result-title">${result.succeeded ? '선택이 좋은 결과로 이어졌습니다' : '이번에는 뜻대로 풀리지 않았습니다'}</h3><p>${escapeHTML(result.text)}</p><div class="result-effects">${effectChips(result.effects)}</div><button id="continue-button" class="primary-button" type="button">${state.sceneIndex === scenes.length - 1 || state.stats.health <= 0 ? '이번 이야기 마무리' : '다음 기록으로'} <span aria-hidden="true">→</span></button>`;
  }
  if (state.phase === 'ending') {
    const successes = state.records.filter(record => record.succeeded).length;
    $('ending-panel').innerHTML = `<div class="ending-emblem" aria-hidden="true">✧</div><p class="eyebrow">THE END · 임시 이야기 완료</p><h2 id="ending-title" tabindex="-1">당신의 하루가<br>하나의 기록이 되었습니다</h2><p>정답은 없었습니다. 다만, 당신의 선택이 남았습니다.<br>진짜 이야기는 앞으로 이 자리에 채워집니다.</p><div class="ending-summary"><div><small>지나온 선택</small><strong>${state.records.length}<span>회</span></strong></div><div><small>성공한 선택</small><strong>${successes}<span>회</span></strong></div><div><small>최종 평판</small><strong>${state.stats.reputation}<span>점</span></strong></div></div><button id="ending-restart" class="primary-button" type="button">새로운 기록 시작하기 <span aria-hidden="true">↗</span></button>`;
  }
  renderStats(); renderPlayback(); renderHistory();
}

let choosing = false;
function choose(id) {
  if (choosing || state.phase !== 'choice' || $('settings-dialog').open || $('restart-dialog').open) return;
  choosing = true;
  try { commit(resolveChoice(state, id)); $('result-title').setAttribute('tabindex', '-1'); $('result-title').focus({ preventScroll: true }); }
  finally { choosing = false; }
}

$('choices').addEventListener('click', event => {
  const button = event.target.closest('[data-choice]');
  if (button) choose(button.dataset.choice);
});
$('result-panel').addEventListener('click', event => {
  if (event.target.closest('#continue-button')) {
    commit(continueStory(state));
    if (state.phase === 'ending') $('ending-title').focus({ preventScroll: true });
    lastTick = performance.now();
  }
});
document.querySelectorAll('[data-speed]').forEach(button => button.addEventListener('click', () => commit({ ...state, speed: Number(button.dataset.speed) })));
$('pause-button').addEventListener('click', () => { if (state.phase === 'travelling') commit({ ...state, paused: !state.paused }); });

function openRestart() { $('restart-dialog').showModal(); }
$('restart-open').addEventListener('click', openRestart);
$('settings-restart').addEventListener('click', () => { $('settings-dialog').close(); openRestart(); });
$('ending-panel').addEventListener('click', event => { if (event.target.closest('#ending-restart')) openRestart(); });
$('restart-cancel').addEventListener('click', () => $('restart-dialog').close());
$('restart-confirm').addEventListener('click', () => {
  $('restart-dialog').close(); commit(createState(newSeed(), state.preferences), { focus: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
$('settings-open').addEventListener('click', () => {
  $('player-name').value = state.preferences.name;
  $('font-size').value = state.preferences.fontSize;
  $('settings-dialog').showModal();
});
document.querySelector('.close-dialog').addEventListener('click', () => $('settings-dialog').close());
$('settings-form').addEventListener('submit', event => {
  event.preventDefault();
  commit({ ...state, preferences: { name: $('player-name').value.trim().slice(0, 20) || '이름 없는 여행자', fontSize: $('font-size').value } });
  $('settings-dialog').close(); showToast('설정을 저장했습니다.');
});
document.addEventListener('keydown', event => {
  if ($('settings-dialog').open || $('restart-dialog').open || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  if (['1', '2', '3'].includes(event.key) && state.phase === 'choice') { event.preventDefault(); choose(['one', 'two', 'three'][Number(event.key) - 1]); }
  if (event.code === 'Space' && state.phase === 'travelling') { event.preventDefault(); commit({ ...state, paused: !state.paused }); }
});

let toastTimeout;
function showToast(message) {
  clearTimeout(toastTimeout); $('toast').textContent = message; $('toast').hidden = false;
  toastTimeout = setTimeout(() => { $('toast').hidden = true; }, 3500);
}

let lastTick = performance.now();
let lastSave = lastTick;
setInterval(() => {
  const now = performance.now();
  const elapsed = Math.min(500, now - lastTick); lastTick = now;
  if (document.hidden || $('settings-dialog').open || $('restart-dialog').open) return;
  const next = advanceTime(state, elapsed);
  if (next === state) return;
  if (next.phase !== state.phase) commit(next, { focus: true });
  else {
    state = next; renderProgress();
    if (now - lastSave >= 1000) { save(); lastSave = now; }
  }
}, 100);
document.addEventListener('visibilitychange', () => { lastTick = performance.now(); save(); });
window.addEventListener('pagehide', save);
render(); save();
if (recoveredSave) showToast('지난 기록을 불러왔습니다. 이어서 선택해 보세요.');
