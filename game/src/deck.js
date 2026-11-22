// The deck: two copies of each of the twelve cards, shuffled with the duel's
// seeded random. Drawing reshuffles the discard pile when the deck runs out,
// so a duel can never stall for want of cards.
import { CARD_DEFS, DECK_COPIES } from './config.js';

let nextUid = 1;

export function buildDeck(random) {
  const deck = [];
  for (let copy = 0; copy < DECK_COPIES; copy += 1) {
    for (const def of CARD_DEFS) {
      deck.push({
        uid: nextUid,
        defId: def.id,
        name: def.name,
        element: def.element,
        cost: def.cost,
        attack: def.attack,
        shield: def.shield,
      });
      nextUid += 1;
    }
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

/** Draw one card into `hand`; reshuffle the discard pile first if needed. */
export function drawCard(side, random) {
  if (side.deck.length === 0) {
    if (side.discard.length === 0) return null;
    side.deck = side.discard;
    side.discard = [];
    for (let i = side.deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const tmp = side.deck[i];
      side.deck[i] = side.deck[j];
      side.deck[j] = tmp;
    }
  }
  const card = side.deck.pop();
  side.hand.push(card);
  return card;
}
