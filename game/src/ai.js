// Both brains of the duel: the opponent AI and the autopilot that stages
// screenshots and play-tests. Each returns card uids to play, in order, from
// the side's current hand and mana. Nothing here touches the screen.
import { COMBOS } from './config.js';

/** The combo bonus a card of `element` would earn after `playedElements`. */
export function comboFor(playedElements, element) {
  if (playedElements.length === 0) return null;
  const prev = playedElements[playedElements.length - 1];
  if (prev === element) return { name: 'RESONANCE', attack: 2, shield: 0, text: `${element} + ${element}: +2 attack` };
  for (const combo of COMBOS) {
    if ((combo.a === prev && combo.b === element) || (combo.a === element && combo.b === prev)) return combo;
  }
  return null;
}

/** Value of playing `card` now, counting the combo it would trigger. */
function cardValue(card, playedElements, ownLife, foeLife) {
  const combo = comboFor(playedElements, card.element);
  const attack = card.attack + (combo ? combo.attack : 0);
  const shield = card.shield + (combo ? combo.shield : 0);
  // Hurt when the foe is close to dead, guard when we are.
  const attackWeight = foeLife <= 10 ? 2.4 : 1.6;
  const shieldWeight = ownLife <= 12 ? 2.2 : 0.7;
  return (attack * attackWeight + shield * shieldWeight) / Math.max(1, card.cost);
}

/**
 * The opponent's plan, readable from the log it leaves: it shields when its
 * life is low, otherwise it spends its mana on the hardest-hitting cards it
 * can afford, at most three a turn.
 */
export function chooseAiPlays(side, foe, mana, playedElements) {
  const plays = [];
  let left = mana;
  const elements = playedElements.slice();
  const hand = side.hand.slice();
  while (plays.length < 3) {
    let best = null;
    let bestValue = 0;
    for (const card of hand) {
      if (plays.includes(card.uid) || card.cost > left) continue;
      const value = cardValue(card, elements, side.life, foe.life);
      if (value > bestValue) {
        bestValue = value;
        best = card;
      }
    }
    if (best === null) break;
    plays.push(best.uid);
    left -= best.cost;
    elements.push(best.element);
  }
  return plays;
}

/** A weaker opponent for the win staging: one card a turn, the cheapest hit. */
export function chooseWeakAiPlays(side, foe, mana, playedElements) {
  let best = null;
  for (const card of side.hand) {
    if (card.cost > mana) continue;
    if (best === null || card.attack < best.attack) best = card;
  }
  return best === null ? [] : [best.uid];
}

/**
 * The player's autopilot: spend every mana on the best-value cards, so a
 * staged game actually fights instead of passing.
 */
export function choosePlayerPlays(side, foe, mana, playedElements) {
  const plays = [];
  let left = mana;
  const elements = playedElements.slice();
  const hand = side.hand.slice();
  while (true) {
    let best = null;
    let bestValue = 0;
    for (const card of hand) {
      if (plays.includes(card.uid) || card.cost > left) continue;
      const value = cardValue(card, elements, side.life, foe.life);
      if (value > bestValue) {
        bestValue = value;
        best = card;
      }
    }
    if (best === null) break;
    plays.push(best.uid);
    left -= best.cost;
    elements.push(best.element);
  }
  return plays;
}
