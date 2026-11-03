import { DIFFICULTIES, KEY_SETS, RULES, KEYBOARD_ROWS } from './config.js';
import { BubblesGame } from './bubbles.js';
import { KeyMagnetGame } from './keymagnet.js';
import { GameLoop } from './loop.js';

const $ = id => document.getElementById(id);
const loop = new GameLoop();
let mode = 'bubbles';
let model = null;
let phase = 'home';
let keyFeedback = null;
const bubbleNodes = new Map();
const keyNodes = new Map();
const accuracy = game => game.correct + game.incorrect ? Math.round(game.correct / (game.correct + game.incorrect) * 100) : 0;
const formatTime = seconds => `${seconds.toFixed(1)}s`;

// Build the input panel once. Both physical and touch input share handleInput().
for (const row of KEYBOARD_ROWS) {
  const rowNode = document.createElement('div');
  rowNode.className = 'keyboard-row';
  for (const letter of row) {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'key';
    key.textContent = letter;
    key.setAttribute('aria-label', `Type ${letter}`);
    key.addEventListener('click', () => handleInput(letter));
    keyNodes.set(letter, key);
    rowNode.append(key);
  }
  $('keyboard').append(rowNode);
}

function feedback(message, state = '') {
  const node = $('feedback');
  node.textContent = message;
  node.className = `feedback ${state}`;
  // Restart only a short CSS feedback animation; no timer is created.
  void node.offsetWidth;
  if (state) node.classList.add('flash');
}
function stopSession() {
  loop.stop();
  model = null;
  keyFeedback = null;
  bubbleNodes.clear();
  $('bubble-field').replaceChildren();
}
function updateSettings() {
  const config = DIFFICULTIES[$('difficulty').value];
  $('difficulty-hint').textContent = mode === 'bubbles'
    ? `${config.bubbleCount} bubbles · ${config.bubbleSpeed}% field height per second initially.`
    : `${config.seconds} seconds to match ${RULES.targetCount} targets.`;
  $('key-set-field').hidden = mode !== 'keymagnet';
  renderKeyboard();
  renderStats();
}
function prepare(selectedMode, resetDefaults = false) {
  stopSession();
  mode = selectedMode;
  phase = 'ready';
  if (resetDefaults) { $('difficulty').value = 'easy'; $('key-set').value = 'home'; }
  $('home').hidden = true;
  $('play').hidden = false;
  $('results').hidden = true;
  $('ready').hidden = false;
  $('settings').disabled = false;
  $('restart').disabled = true;
  $('session-tag').textContent = 'Ready when you are';
  const isBubbles = mode === 'bubbles';
  $('game-title').textContent = isBubbles ? 'Bubbles' : 'KeyMagnet';
  $('game-subtitle').textContent = isBubbles ? 'Catch the letters. Keep the rhythm.' : 'Find your focus, one key at a time.';
  $('bubble-stage').hidden = true;
  $('magnet-stage').hidden = true;
  $('target').textContent = '—';
  $('target-progress').textContent = '0 of 30 targets';
  $('progress-fill').style.width = '0%';
  $('ready-title').textContent = isBubbles ? 'Ready to rise?' : 'Find your focus.';
  $('ready-text').textContent = isBubbles ? 'Type any visible letter before it reaches the escape line. How long can you keep up?' : 'Match the displayed key. Complete 30 targets before time runs out.';
  const rules = isBubbles
    ? ['Type a visible letter to pop its bubble. A new bubble takes its place.', 'A bubble crossing the top line counts as a miss. The run ends at 6 misses.', 'Every 8 pops increases speed by 15% of the starting speed, up to 3×.']
    : ['Type the large target key or tap it on the keyboard below.', 'Wrong keys cost points. The target stays until you match it.', 'Match 30 targets to finish. The session also ends when time runs out.'];
  $('rules-list').replaceChildren(...rules.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  feedback('Choose your settings, then start.');
  updateSettings();
}
function start() {
  stopSession();
  model = mode === 'bubbles' ? new BubblesGame($('difficulty').value) : new KeyMagnetGame($('difficulty').value, $('key-set').value);
  phase = 'playing';
  $('bubble-stage').hidden = mode !== 'bubbles';
  $('magnet-stage').hidden = mode !== 'keymagnet';
  $('ready').hidden = true;
  $('results').hidden = true;
  $('settings').disabled = true;
  $('restart').disabled = false;
  $('session-tag').textContent = `${DIFFICULTIES[$('difficulty').value].label} · In progress`;
  feedback(mode === 'bubbles' ? 'Type a letter inside any bubble.' : 'Match the target key.');
  $('game-title').focus({ preventScroll: true });
  render();
  loop.start(seconds => {
    const previousMisses = model.misses;
    model.update(seconds);
    if (model.misses > previousMisses) feedback(`Bubble escaped · ${model.misses} of ${RULES.missLimit} misses`, 'bad');
    render();
    if (model.ended) finish();
  });
}
function renderStats() {
  const data = mode === 'bubbles'
    ? [['Score', model?.score ?? 0], ['Misses', `${model?.misses ?? 0} / 6`], ['Level', model?.level ?? 1], ['Time', formatTime(model?.elapsed ?? 0)]]
    : [['Score', model?.score ?? 0], ['Time left', formatTime(model?.remaining ?? DIFFICULTIES[$('difficulty').value].seconds)], ['Correct', model?.correct ?? 0], ['Incorrect', model?.incorrect ?? 0]];
  // Reuse nodes while playing instead of rebuilding the live panel every frame.
  if ($('stats').children.length !== data.length) {
    $('stats').innerHTML = data.map(() => '<div class="stat"><span></span><strong></strong></div>').join('');
  }
  data.forEach(([label, value], index) => {
    const stat = $('stats').children[index];
    stat.firstElementChild.textContent = label;
    stat.lastElementChild.textContent = value;
  });
}
function renderKeyboard() {
  const selectedKeys = KEY_SETS[$('key-set').value].keys;
  if (keyFeedback && performance.now() > keyFeedback.until) keyFeedback = null;
  for (const [letter, node] of keyNodes) {
    node.disabled = phase !== 'playing';
    const isTarget = phase === 'playing' && mode === 'keymagnet' && model.target === letter;
    node.className = `key${mode === 'keymagnet' && !selectedKeys.includes(letter) ? ' outside' : ''}${isTarget ? ' target' : ''}${keyFeedback?.letter === letter ? ` key-${keyFeedback.correct ? 'good' : 'bad'}` : ''}`;
    node.setAttribute('aria-label', `Type ${letter}${isTarget ? ', current target' : ''}`);
  }
}
function render() {
  renderStats();
  renderKeyboard();
  if (mode === 'bubbles') {
    const ids = new Set(model.bubbles.map(b => b.id));
    for (const [id, node] of bubbleNodes) if (!ids.has(id)) { node.remove(); bubbleNodes.delete(id); }
    for (const bubble of model.bubbles) {
      let node = bubbleNodes.get(bubble.id);
      if (!node) {
        node = document.createElement('span');
        node.className = 'bubble';
        node.textContent = bubble.letter;
        $('bubble-field').append(node);
        bubbleNodes.set(bubble.id, node);
      }
      node.style.left = `${(bubble.lane + 0.5) / model.config.bubbleCount * 100}%`;
      node.style.top = `${bubble.y}%`;
    }
  } else {
    $('target').textContent = model.target;
    $('target-progress').textContent = `${model.correct} of ${RULES.targetCount} targets`;
    $('progress-fill').style.width = `${model.correct / RULES.targetCount * 100}%`;
  }
}
function handleInput(letter) {
  if (phase !== 'playing') return;
  // Bring time forward before evaluating input, including input at a deadline.
  loop.advance();
  if (phase !== 'playing') return;
  const previousLevel = model.level;
  const response = model.input(letter);
  keyFeedback = { letter, correct: response.correct, until: performance.now() + 350 };
  const levelMessage = mode === 'bubbles' && model.level > previousLevel ? ` · Level ${model.level}: faster bubbles` : '';
  feedback(response.message + levelMessage, response.correct ? 'good' : 'bad');
  render();
  if (model.ended) finish();
}
function finish() {
  loop.stop();
  phase = 'ended';
  $('bubble-stage').hidden = true;
  $('magnet-stage').hidden = true;
  keyFeedback = null;
  $('results').hidden = false;
  $('session-tag').textContent = 'Session complete';
  $('result-title').textContent = mode === 'bubbles' ? 'A good run.' : model.correct === RULES.targetCount ? 'All keys matched.' : 'Time’s up.';
  $('final-score').textContent = model.score;
  const stats = mode === 'bubbles'
    ? [['Bubbles popped', model.correct], ['Incorrect keys', model.incorrect], ['Misses', model.misses], ['Accuracy', `${accuracy(model)}%`], ['Time played', formatTime(model.elapsed)], ['Level reached', model.level]]
    : [['Correct keys', model.correct], ['Incorrect keys', model.incorrect], ['Accuracy', `${accuracy(model)}%`], ['Avg. response', model.correct ? formatTime(model.averageResponse) : '—'], ['Time played', formatTime(model.elapsed)], ['Targets', `${model.correct} / 30`]];
  $('result-stats').replaceChildren(...stats.map(([label, value]) => {
    const group = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = value;
    group.append(dt, dd); return group;
  }));
  renderKeyboard();
  feedback(mode === 'bubbles' ? 'Six misses reached. Play again to start a fresh run.' : 'Session ended. Average response includes time spent correcting mistakes.');
  $('result-title').focus({ preventScroll: true });
}
function goHome() {
  stopSession();
  phase = 'home';
  $('play').hidden = true;
  $('home').hidden = false;
  document.querySelector(`[data-choose="${mode}"]`).focus({ preventScroll: true });
}
for (const button of document.querySelectorAll('[data-choose]')) button.addEventListener('click', () => { prepare(button.dataset.choose, true); $('game-title').focus({ preventScroll: true }); });
$('start').addEventListener('click', start);
$('restart').addEventListener('click', start);
$('play-again').addEventListener('click', start);
$('reset').addEventListener('click', () => { prepare(mode, true); $('start').focus({ preventScroll: true }); });
$('difficulty').addEventListener('change', updateSettings);
$('key-set').addEventListener('change', updateSettings);
$('back').addEventListener('click', goHome);
$('brand').addEventListener('click', event => { event.preventDefault(); goHome(); });
document.addEventListener('keydown', event => {
  if (phase !== 'playing' || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
  if (/^[a-z]$/i.test(event.key)) { event.preventDefault(); handleInput(event.key.toUpperCase()); }
});
window.addEventListener('pagehide', () => loop.stop());
// Back/forward cache may restore the page with a stopped loop: restore a clean ready state.
window.addEventListener('pageshow', event => { if (event.persisted && phase !== 'home') prepare(mode); });
