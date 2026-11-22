// Boot and the one loop: input is read every frame, the opponent's turn is
// animated one card at a time, and the renderer paints what is there. The
// game moves between four screens: title, play, win and loss.
//
// ?seed=N fixes the shuffle. ?shot=start|play|win|loss (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY } from './config.js';
import { createRandom } from './random.js';
import { createDuel, PHASE_ENEMY, PHASE_LOSS, PHASE_PLAYER, PHASE_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_END_TURN, createInput } from './input.js';
import { createRenderer, SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const ENEMY_CARD_MS = 650;
const ENEMY_END_MS = 500;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const duel = createDuel(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

// Test hook: the play-test drives the real duel through this, never a mock.
window.__game = {
  state: duel.state,
  seed,
  start: () => duel.start(),
  playCard: (i) => duel.playPlayerCard(i),
  endTurn: () => duel.endPlayerTurn(false),
};

function runShot(name) {
  const scene = stageShot(name, duel);
  let painted = 0;
  function paint() {
    renderer.draw(duel.state, scene.screen, scene.best, -1);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let hoverIndex = -1;
  let enemyTimer = 0;
  let enemySettledAt = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    duel.start();
    screen = SCREEN_PLAY;
    announce('Duel started. Play a card, then end your turn.');
  }

  function endGame() {
    const won = duel.state.phase === PHASE_WIN;
    screen = won ? SCREEN_WIN : SCREEN_LOSS;
    if (won && duel.state.result.score > best) {
      best = duel.state.result.score;
      saveBest(best);
    }
    announce(won ? `Victory! Score ${duel.state.result.score}.` : 'Defeat. Sable takes the duel.');
  }

  function beginEnemyAnimation() {
    duel.beginEnemyTurn(false);
    enemyTimer = performance.now() + ENEMY_CARD_MS;
    enemySettledAt = 0;
  }

  function stepEnemyAnimation(now) {
    if (duel.state.phase !== PHASE_ENEMY) return;
    if (now < enemyTimer) return;
    const done = duel.stepEnemyTurn();
    if (duel.state.phase === PHASE_LOSS) {
      endGame();
      return;
    }
    if (done) {
      if (!enemySettledAt) enemySettledAt = now;
      if (now - enemySettledAt >= ENEMY_END_MS) {
        duel.finishEnemyTurn();
        screen = SCREEN_PLAY;
      }
      return;
    }
    enemyTimer = now + ENEMY_CARD_MS;
  }

  function handleClick(click) {
    if (!click) return;
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSS) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY || duel.state.phase !== PHASE_PLAYER) return;
    const hand = duel.state.player.hand;
    for (let i = hand.length - 1; i >= 0; i -= 1) {
      const r = renderer.handCardRect(i, hand.length);
      if (renderer.pointIn({ x: r.x, y: r.y - (i === hoverIndex ? 18 : 0), w: r.w, h: r.h }, click.x, click.y)) {
        duel.playPlayerCard(i);
        if (duel.state.phase === PHASE_WIN) endGame();
        return;
      }
    }
    const b = renderer.endTurnRect();
    if (renderer.pointIn(b, click.x, click.y)) beginEnemyAnimation();
  }

  function handleActions() {
    const actions = input.takeActions();
    const digit = input.takeDigit();
    if (actions & ACTION_CONFIRM) {
      const click = input.takeClick();
      if (click) handleClick(click);
      else if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSS) startGame();
    }
    if (actions & ACTION_END_TURN && screen === SCREEN_PLAY && duel.state.phase === PHASE_PLAYER) {
      beginEnemyAnimation();
    }
    if (digit >= 0 && screen === SCREEN_PLAY && duel.state.phase === PHASE_PLAYER) {
      duel.playPlayerCard(digit);
      if (duel.state.phase === PHASE_WIN) endGame();
    }
  }

  function hoverCard() {
    const p = input.pointer();
    hoverIndex = -1;
    if (screen !== SCREEN_PLAY || duel.state.phase !== PHASE_PLAYER) return;
    const hand = duel.state.player.hand;
    for (let i = hand.length - 1; i >= 0; i -= 1) {
      const r = renderer.handCardRect(i, hand.length);
      if (renderer.pointIn(r, p.x, p.y)) {
        hoverIndex = i;
        return;
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    handleActions();
    hoverCard();
    if (duel.state.phase === PHASE_ENEMY) stepEnemyAnimation(now);
    // The duel can end through any path (a click, a key, the test hook):
    // the screen follows the phase, it never waits for a second event.
    if ((duel.state.phase === PHASE_WIN || duel.state.phase === PHASE_LOSS) && screen === SCREEN_PLAY) endGame();
    renderer.draw(duel.state, screen, best, hoverIndex);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) enemyTimer = performance.now() + ENEMY_CARD_MS;
  });

  announce('Ember Sigil Duel. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
