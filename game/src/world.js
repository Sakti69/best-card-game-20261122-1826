// The duel's rules and state, with no drawing and no browser in it: life and
// shield pools, mana, hands, decks, combos, turns and the win/loss check.
// Every function here is callable from Node, so the duel can be simulated
// headless to prove a win and a loss are really reachable.
import { HAND_MAX, HAND_START, LIFE_START, MANA_MAX } from './config.js';
import { buildDeck, drawCard } from './deck.js';
import { chooseAiPlays, chooseWeakAiPlays, comboFor } from './ai.js';

export const EVENT_PLAY = 1;
export const EVENT_WIN = 2;
export const EVENT_LOSS = 4;
export const EVENT_TURN = 8;

export const PHASE_TITLE = 'title';
export const PHASE_PLAYER = 'player';
export const PHASE_ENEMY = 'enemy';
export const PHASE_WIN = 'win';
export const PHASE_LOSS = 'loss';

const LOG_MAX = 5;

function makeSide(random) {
  const side = { life: LIFE_START, shield: 0, hand: [], deck: buildDeck(random), discard: [] };
  for (let i = 0; i < HAND_START; i += 1) drawCard(side, random);
  return side;
}

export function createDuel(random) {
  const state = {
    phase: PHASE_TITLE,
    turn: 1,
    mana: 1,
    manaMax: 1,
    player: null,
    enemy: null,
    playedElements: [],
    lastPlayedPlayer: [],
    lastPlayedEnemy: [],
    combo: null,
    comboAt: 0,
    log: [],
    stats: { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, combos: 0, turns: 0 },
    result: null,
  };
  let enemyPlays = [];
  let enemyWeak = false;

  function say(text) {
    state.log.push(text);
    if (state.log.length > LOG_MAX) state.log.shift();
  }

  function reset() {
    state.phase = PHASE_TITLE;
    state.turn = 1;
    state.mana = 1;
    state.manaMax = 1;
    state.player = makeSide(random);
    state.enemy = makeSide(random);
    state.playedElements = [];
    state.lastPlayedPlayer = [];
    state.lastPlayedEnemy = [];
    state.combo = null;
    state.log = ['The sigils are dealt. Strike first.'];
    state.stats = { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, combos: 0, turns: 0 };
    state.result = null;
    enemyPlays = [];
    enemyWeak = false;
  }

  function start() {
    reset();
    state.phase = PHASE_PLAYER;
    say('Your turn — 1 mana. Play a card, then End Turn.');
  }

  /** Damage goes through shield first, then life. Returns life damage dealt. */
  function dealDamage(target, amount) {
    const absorbed = Math.min(target.shield, amount);
    target.shield -= absorbed;
    const lifeHit = amount - absorbed;
    target.life = Math.max(0, target.life - lifeHit);
    return lifeHit;
  }

  function checkEnd() {
    if (state.enemy.life <= 0) {
      state.phase = PHASE_WIN;
      state.result = scoreResult(true);
      return EVENT_WIN;
    }
    if (state.player.life <= 0) {
      state.phase = PHASE_LOSS;
      state.result = scoreResult(false);
      return EVENT_LOSS;
    }
    return 0;
  }

  function scoreResult(won) {
    const s = state.stats;
    const score = s.damageDealt * 2 + s.cardsPlayed * 15 + s.combos * 40
      + (won ? 500 + Math.max(0, 300 - s.turns * 10) : 0);
    return {
      won,
      score,
      turns: s.turns,
      damageDealt: s.damageDealt,
      cardsPlayed: s.cardsPlayed,
      combos: s.combos,
      playerLife: state.player.life,
      enemyLife: state.enemy.life,
    };
  }

  /**
   * Play one card from `side`'s hand against `foe`. `byPlayer` picks whose
   * log line and last-played row it lands in. Returns EVENT_* flags.
   */
  function playCardFrom(side, foe, uid, byPlayer) {
    const index = side.hand.findIndex((c) => c.uid === uid);
    if (index === -1) return 0;
    const card = side.hand[index];
    if (byPlayer) {
      if (state.phase !== PHASE_PLAYER || card.cost > state.mana) return 0;
      state.mana -= card.cost;
    }
    side.hand.splice(index, 1);
    side.discard.push(card);
    const combo = comboFor(state.playedElements, card.element);
    const attack = card.attack + (combo ? combo.attack : 0);
    const shield = card.shield + (combo ? combo.shield : 0);
    state.playedElements.push(card.element);
    if (combo) {
      state.combo = combo;
      state.comboAt = Date.now();
      state.stats.combos += 1;
    }
    if (shield > 0) side.shield += shield;
    let events = EVENT_PLAY;
    if (attack > 0) {
      const lifeHit = dealDamage(foe, attack);
      if (byPlayer) state.stats.damageDealt += lifeHit;
      else state.stats.damageTaken += lifeHit;
    }
    state.stats.cardsPlayed += 1;
    const comboText = combo ? ` — ${combo.name}!` : '';
    const who = byPlayer ? 'You play' : 'Sable plays';
    say(`${who} ${card.name} (${card.attack}⚔ ${card.shield}🛡)${comboText}`);
    if (byPlayer) state.lastPlayedPlayer = [card, ...(state.lastPlayedPlayer || [])].slice(0, 3);
    else state.lastPlayedEnemy = [card, ...(state.lastPlayedEnemy || [])].slice(0, 3);
    events |= checkEnd();
    return events;
  }

  /** The player's click: play hand card `index` (0-based). */
  function playPlayerCard(index) {
    if (state.phase !== PHASE_PLAYER) return 0;
    const card = state.player.hand[index];
    if (!card || card.cost > state.mana) return 0;
    return playCardFrom(state.player, state.enemy, card.uid, true);
  }

  /** Begin the opponent's turn: it draws, refills mana, plans its plays. */
  function beginEnemyTurn(weak) {
    enemyWeak = weak;
    state.phase = PHASE_ENEMY;
    state.playedElements = [];
    state.combo = null;
    drawCard(state.enemy, random);
    const mana = Math.min(MANA_MAX, state.turn);
    const chooser = weak ? chooseWeakAiPlays : chooseAiPlays;
    enemyPlays = chooser(state.enemy, state.player, mana, []);
    if (enemyPlays.length === 0) say('Sable holds — no card worth playing.');
    return enemyPlays.length;
  }

  /** Play the opponent's next planned card. Returns true when its turn is done. */
  function stepEnemyTurn() {
    if (enemyPlays.length === 0) return true;
    const uid = enemyPlays.shift();
    playCardFrom(state.enemy, state.player, uid, false);
    return enemyPlays.length === 0 || state.phase === PHASE_LOSS;
  }

  /** Close the opponent's turn and open the player's next one. */
  function finishEnemyTurn() {
    state.turn += 1;
    state.stats.turns = state.turn;
    state.manaMax = Math.min(MANA_MAX, state.turn);
    state.mana = state.manaMax;
    state.playedElements = [];
    state.combo = null;
    if (state.player.hand.length < HAND_MAX) drawCard(state.player, random);
    state.phase = PHASE_PLAYER;
    say(`Turn ${state.turn} — ${state.mana} mana. Your move.`);
    return EVENT_TURN;
  }

  /** The player's End Turn button: the whole enemy turn, instantly. */
  function endPlayerTurn(weak) {
    if (state.phase !== PHASE_PLAYER) return 0;
    beginEnemyTurn(weak);
    let events = 0;
    while (!stepEnemyTurn()) {
      if (state.phase === PHASE_LOSS) break;
    }
    if (state.phase === PHASE_LOSS) return EVENT_LOSS;
    events |= finishEnemyTurn();
    return events;
  }

  reset();
  return {
    state,
    reset,
    start,
    playPlayerCard,
    playCardFrom,
    beginEnemyTurn,
    stepEnemyTurn,
    finishEnemyTurn,
    endPlayerTurn,
  };
}
