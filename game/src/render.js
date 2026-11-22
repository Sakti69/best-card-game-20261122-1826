// Drawing only: the duel's state and the current screen in, pixels out. The
// 1280x720 table is scaled to fit the window and centred. Cards are drawn
// with a colour AND a shape per suit, big numbers, and a name — legible even
// shrunk to a thumbnail.
import { ELEMENTS, FIELD, FONT, LIFE_START, PALETTE } from './config.js';
import { PHASE_PLAYER } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

const CARD_W = 150;
const CARD_H = 200;
const MINI_W = 84;
const MINI_H = 110;
const HAND_Y = 500;
const HAND_GAP = 12;

export function handCardRect(index, count) {
  const total = count * CARD_W + (count - 1) * HAND_GAP;
  const x0 = (FIELD.width - total) / 2;
  return { x: x0 + index * (CARD_W + HAND_GAP), y: HAND_Y, w: CARD_W, h: CARD_H };
}

export function endTurnRect() {
  return { x: 1064, y: 414, w: 176, h: 56 };
}

function pointIn(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The suit's shape, drawn in its colour: flame, drop, diamond, hexagon. */
function drawShape(ctx, shape, cx, cy, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (shape === 'flame') {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.8, cy + size * 0.4);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.9);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.9);
    ctx.lineTo(cx - size * 0.8, cy + size * 0.4);
  } else if (shape === 'drop') {
    ctx.moveTo(cx, cy - size);
    ctx.quadraticCurveTo(cx + size, cy + size * 0.2, cx, cy + size);
    ctx.quadraticCurveTo(cx - size, cy + size * 0.2, cx, cy - size);
  } else if (shape === 'diamond') {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size, cy);
  } else {
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = cx + size * Math.cos(a);
      const py = cy + size * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
}

function drawCard(ctx, card, x, y, w, h, opts) {
  const el = ELEMENTS[card.element];
  const scale = w / CARD_W;
  const dimmed = opts && opts.dimmed;
  ctx.save();
  if (opts && opts.faceDown) {
    roundRect(ctx, x, y, w, h, 10 * scale);
    ctx.fillStyle = '#2a2140';
    ctx.fill();
    ctx.strokeStyle = PALETTE.enemy;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawShape(ctx, 'hex', x + w / 2, y + h / 2, 22 * scale, PALETTE.enemy);
    ctx.restore();
    return;
  }
  roundRect(ctx, x, y, w, h, 10 * scale);
  ctx.fillStyle = dimmed ? '#3a3f4a' : '#f7f3e8';
  ctx.fill();
  ctx.strokeStyle = el.color;
  ctx.lineWidth = 3 * scale;
  ctx.stroke();
  // Header band with the name, centred clear of the cost gem on the left.
  ctx.fillStyle = el.color;
  ctx.fillRect(x + 3, y + 3, w - 6, 34 * scale);
  ctx.fillStyle = '#ffffff';
  const nameSize = Math.round((card.name.length > 12 ? 12 : 15) * scale);
  ctx.font = `bold ${nameSize}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.name.toUpperCase(), x + w / 2 + 12 * scale, y + 20 * scale);
  // Cost gem, top-left over the band.
  ctx.fillStyle = '#7dd3fc';
  ctx.beginPath();
  ctx.arc(x + 20 * scale, y + 20 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#082f49';
  ctx.font = `bold ${Math.round(17 * scale)}px ${FONT}`;
  ctx.fillText(String(card.cost), x + 20 * scale, y + 21 * scale);
  // Big suit shape in the middle.
  drawShape(ctx, el.shape, x + w / 2, y + h * 0.46, 34 * scale, el.color);
  ctx.fillStyle = el.dark;
  ctx.font = `bold ${Math.round(20 * scale)}px ${FONT}`;
  ctx.fillText(el.glyph, x + w / 2, y + h * 0.46 + 1);
  // Element name under the shape.
  ctx.fillStyle = '#4b5563';
  ctx.font = `${Math.round(14 * scale)}px ${FONT}`;
  ctx.fillText(el.name.toUpperCase(), x + w / 2, y + h * 0.66);
  // Attack bottom-left, shield bottom-right: the numbers a player reads.
  ctx.fillStyle = '#b91c1c';
  ctx.font = `bold ${Math.round(26 * scale)}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`⚔${card.attack}`, x + 12 * scale, y + h - 14 * scale);
  ctx.fillStyle = '#1d4ed8';
  ctx.textAlign = 'right';
  ctx.fillText(`🛡${card.shield}`, x + w - 12 * scale, y + h - 14 * scale);
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${size}:${weight || ''}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? 'bold ' : ''}${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function lifeBar(x, y, w, label, life, shield, color) {
    text(label, x, y - 8, 15, PALETTE.muted, 'left', 'bold');
    ctx.fillStyle = '#0a0d12';
    roundRect(ctx, x, y, w, 22, 6);
    ctx.fill();
    const frac = Math.max(0, life / LIFE_START);
    ctx.fillStyle = color;
    if (frac > 0) {
      roundRect(ctx, x + 2, y + 2, (w - 4) * frac, 18, 5);
      ctx.fill();
    }
    text(`${life} / ${LIFE_START}`, x + w / 2, y + 17, 15, '#ffffff', 'center', 'bold');
    if (shield > 0) text(`🛡 Shield ${shield}`, x + w + 12, y + 17, 16, PALETTE.shield, 'left', 'bold');
  }

  function drawTable(state) {
    ctx.fillStyle = PALETTE.feltDark;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.felt;
    roundRect(ctx, 16, 96, FIELD.width - 32, 388, 24);
    ctx.fill();
    ctx.strokeStyle = PALETTE.feltEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Opponent row.
    text('SABLE — MIRROR WARDEN', 24, 34, 20, '#c4b5fd', 'left', 'bold');
    lifeBar(360, 16, 380, '', state.enemy.life, state.enemy.shield, '#8b5cf6');
    text(`Deck ${state.enemy.deck.length}`, 1180, 34, 16, PALETTE.muted, 'right');
    const foeHand = state.enemy.hand.length;
    for (let i = 0; i < foeHand; i += 1) {
      const x = 640 - (foeHand * 52) / 2 + i * 52;
      drawCard(ctx, state.enemy.hand[i], x, 104, 48, 66, { faceDown: true });
    }
    text(`Sable's hand: ${foeHand} cards`, 24, 150, 15, PALETTE.muted, 'left');
    // Played cards in the middle of the table.
    text('SABLE PLAYED', 640, 192, 14, PALETTE.muted, 'center', 'bold');
    state.lastPlayedEnemy.forEach((card, i) => {
      drawCard(ctx, card, 640 - 42 - i * 94 + (state.lastPlayedEnemy.length - 1) * 47, 200, MINI_W, MINI_H, {});
    });
    text('YOU PLAYED', 640, 352, 14, PALETTE.muted, 'center', 'bold');
    state.lastPlayedPlayer.forEach((card, i) => {
      drawCard(ctx, card, 640 - 42 - i * 94 + (state.lastPlayedPlayer.length - 1) * 47, 360, MINI_W, MINI_H, {});
    });
    // Combo banner, between the two played rows.
    if (state.combo) {
      ctx.fillStyle = 'rgba(242, 201, 76, 0.95)';
      roundRect(ctx, 440, 314, 400, 36, 10);
      ctx.fill();
      text(`COMBO: ${state.combo.name}!`, 640, 339, 20, '#1a1405', 'center', 'bold');
    }
    // Log panel, right of the table.
    ctx.fillStyle = 'rgba(10, 13, 18, 0.85)';
    roundRect(ctx, 1012, 196, 252, 152, 10);
    ctx.fill();
    text('DUEL LOG', 1024, 218, 13, PALETTE.gold, 'left', 'bold');
    state.log.forEach((line, i) => {
      text(line.length > 34 ? line.slice(0, 33) + '…' : line, 1024, 242 + i * 20, 13, PALETTE.text, 'left');
    });
    // Player HUD: life, mana, deck.
    lifeBar(24, 470, 300, 'YOU', state.player.life, state.player.shield, PALETTE.life);
    text('MANA', 24, 520, 14, PALETTE.mana, 'left', 'bold');
    for (let i = 0; i < 10; i += 1) {
      ctx.fillStyle = i < state.mana ? PALETTE.mana : '#1e293b';
      ctx.beginPath();
      ctx.arc(80 + i * 24, 514, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    // Right of the hand, clear of the cards: turn and mana count.
    text(`Turn ${state.turn}  •  Mana ${state.mana}/${state.manaMax}`, 1000, 520, 16, PALETTE.text, 'left', 'bold');
    text(`Deck ${state.player.deck.length}  •  Discard ${state.player.discard.length}`, 24, 548, 14, PALETTE.muted, 'left');
  }

  function drawHand(state, hoverIndex) {
    const hand = state.player.hand;
    for (let i = 0; i < hand.length; i += 1) {
      const r = handCardRect(i, hand.length);
      const lift = i === hoverIndex ? 18 : 0;
      const dimmed = state.phase === PHASE_PLAYER && hand[i].cost > state.mana;
      drawCard(ctx, hand[i], r.x, r.y - lift, r.w, r.h, { dimmed });
      if (dimmed) {
        ctx.fillStyle = 'rgba(10, 13, 18, 0.45)';
        roundRect(ctx, r.x, r.y - lift, r.w, r.h, 10);
        ctx.fill();
      }
    }
    // End Turn button, inside the table at the right.
    const b = endTurnRect();
    const enabled = state.phase === PHASE_PLAYER;
    ctx.fillStyle = enabled ? PALETTE.button : '#4b5563';
    roundRect(ctx, b.x, b.y, b.w, b.h, 12);
    ctx.fill();
    text(enabled ? 'END TURN [E]' : 'SABLE PLAYS…', b.x + b.w / 2, b.y + 36, 19, enabled ? PALETTE.buttonText : '#d1d5db', 'center', 'bold');
    if (state.phase === PHASE_PLAYER) {
      text('Click a card to play it • 1–7 keys work too', 640, 712, 14, PALETTE.muted, 'center');
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    ctx.fillStyle = 'rgba(5, 7, 10, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const w = 680;
    const h = 150 + lines.length * 34 + 70;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    text(title, FIELD.width / 2, y + 72, 46, accent, 'center', 'bold');
    lines.forEach((line, i) => {
      text(line, FIELD.width / 2, y + 122 + i * 34, 20, PALETTE.text, 'center');
    });
    text(prompt, FIELD.width / 2, y + h - 34, 20, PALETTE.gold, 'center', 'bold');
  }

  function drawTitle(state, best) {
    // A fanned preview of cards behind the panel.
    const sample = state.player.hand.slice(0, 5);
    sample.forEach((card, i) => {
      drawCard(ctx, card, 300 + i * 140, 96, CARD_W, CARD_H, {});
    });
    const lines = [
      'A duel of sigils: Ember, Tide, Gale and Stone.',
      'Spend mana, play cards, chain two suits for a combo.',
      'First to bring the other to 0 life wins. Life 30 vs 30.',
      `Best score: ${best}`,
    ];
    drawPanel('EMBER SIGIL DUEL', lines, 'Press Space or click to duel', PALETTE.gold);
    // Element legend.
    let lx = 400;
    for (const key of ['ember', 'tide', 'gale', 'stone']) {
      const el = ELEMENTS[key];
      drawShape(ctx, el.shape, lx, 596, 14, el.color);
      text(el.name, lx + 22, 602, 16, PALETTE.text, 'left', 'bold');
      lx += 130;
    }
  }

  function drawEnd(state, won) {
    const r = state.result;
    const lines = [
      `Score  ${r.score}`,
      `Turns ${r.turns}   •   Damage dealt ${r.damageDealt}`,
      `Cards played ${r.cardsPlayed}   •   Combos ${r.combos}`,
      `Your life ${r.playerLife}   •   Sable's life ${r.enemyLife}`,
    ];
    drawPanel(
      won ? 'VICTORY!' : 'DEFEAT',
      lines,
      'Press Space or click to duel again',
      won ? PALETTE.gold : '#e2483a',
    );
  }

  function draw(state, screen, best, hoverIndex) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawTable(state);
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
      return;
    }
    drawHand(state, screen === SCREEN_PLAY ? hoverIndex : -1);
    if (screen === SCREEN_WIN) drawEnd(state, true);
    else if (screen === SCREEN_LOSS) drawEnd(state, false);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, pointIn, handCardRect, endTurnRect };
}
