// Every tuning number, card definition and colour in one place. The table is a
// fixed 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

export const LIFE_START = 30;
export const HAND_START = 4;
export const HAND_MAX = 7;
export const MANA_MAX = 10;
export const DECK_COPIES = 2;

/** The four suits. Each has a colour AND a shape, so a card reads by either. */
export const ELEMENTS = {
  ember: { name: 'Ember', color: '#e2483a', dark: '#8f1f16', shape: 'flame', glyph: '▲' },
  tide: { name: 'Tide', color: '#2f8fe8', dark: '#144a80', shape: 'drop', glyph: '●' },
  gale: { name: 'Gale', color: '#37b06a', dark: '#14532d', shape: 'diamond', glyph: '◆' },
  stone: { name: 'Stone', color: '#d99a2b', dark: '#7a5410', shape: 'hex', glyph: '⬢' },
};

/**
 * The twelve original cards. cost is mana, attack is damage to the foe
 * (through their shield first), shield is a pool that absorbs damage.
 */
export const CARD_DEFS = [
  { id: 'ember-imp', name: 'Ember Imp', element: 'ember', cost: 1, attack: 3, shield: 0 },
  { id: 'cinder-whelp', name: 'Cinder Whelp', element: 'ember', cost: 2, attack: 5, shield: 0 },
  { id: 'wildfire-drake', name: 'Wildfire Drake', element: 'ember', cost: 5, attack: 9, shield: 0 },
  { id: 'tide-sprite', name: 'Tide Sprite', element: 'tide', cost: 1, attack: 2, shield: 2 },
  { id: 'reef-guardian', name: 'Reef Guardian', element: 'tide', cost: 3, attack: 3, shield: 5 },
  { id: 'deep-leviathan', name: 'Deep Leviathan', element: 'tide', cost: 5, attack: 7, shield: 4 },
  { id: 'gale-falcon', name: 'Gale Falcon', element: 'gale', cost: 2, attack: 4, shield: 1 },
  { id: 'storm-crow', name: 'Storm Crow', element: 'gale', cost: 3, attack: 6, shield: 0 },
  { id: 'zephyr-dancer', name: 'Zephyr Dancer', element: 'gale', cost: 1, attack: 1, shield: 3 },
  { id: 'stone-golem', name: 'Stone Golem', element: 'stone', cost: 3, attack: 2, shield: 6 },
  { id: 'pebble-guard', name: 'Pebble Guard', element: 'stone', cost: 1, attack: 1, shield: 4 },
  { id: 'mountain-titan', name: 'Mountain Titan', element: 'stone', cost: 6, attack: 8, shield: 6 },
];

/**
 * Combos fire when two elements are played on the same turn, in either order.
 * Same element twice is Resonance. The bonus lands on the second card.
 */
export const COMBOS = [
  { a: 'ember', b: 'gale', name: 'WILDFIRE', attack: 3, shield: 0, text: 'Ember + Gale: +3 attack' },
  { a: 'tide', b: 'stone', name: 'MUDWALL', attack: 0, shield: 4, text: 'Tide + Stone: +4 shield' },
  { a: 'ember', b: 'tide', name: 'STEAM VEIL', attack: 2, shield: 2, text: 'Ember + Tide: +2 attack, +2 shield' },
  { a: 'gale', b: 'stone', name: 'SANDSTORM', attack: 3, shield: 0, text: 'Gale + Stone: +3 attack' },
  { a: 'gale', b: 'tide', name: 'MISTRAL', attack: 1, shield: 2, text: 'Gale + Tide: +1 attack, +2 shield' },
];

export const PALETTE = {
  backdrop: '#0d0f14',
  felt: '#14532d',
  feltDark: '#0f3d21',
  feltEdge: '#c9a227',
  panel: '#1c2230',
  panelEdge: '#3a4358',
  text: '#f2f0e6',
  muted: '#9aa3b2',
  gold: '#f2c94c',
  mana: '#7dd3fc',
  life: '#e2483a',
  shield: '#8fa8c8',
  button: '#c9a227',
  buttonText: '#1a1405',
  enemy: '#8b5cf6',
  player: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'ember-sigil-duel.best';
