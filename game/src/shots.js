// The screenshot scenes behind ?shot=start|play|win|loss. Each one plays the
// real rules forward from a fresh duel, steered by the autopilots in ai.js:
// the play scene fights five rounds on both sides, the win scene lets the
// player's autopilot beat a weak opponent, and the loss scene lets the
// opponent beat a player who never attacks. The same seed always gives the
// same frame.
import { choosePlayerPlays } from './ai.js';
import { PHASE_LOSS, PHASE_WIN } from './world.js';
import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const PLAY_ROUNDS = 5;
const MAX_ROUNDS = 60;

/** One full round: player autopilot plays, then the enemy answers. */
function playRound(duel, weakEnemy) {
  const s = duel.state;
  if (s.phase !== 'player') return false;
  const plays = choosePlayerPlays(s.player, s.enemy, s.mana, []);
  for (const uid of plays) {
    const index = s.player.hand.findIndex((c) => c.uid === uid);
    if (index === -1) continue;
    duel.playPlayerCard(index);
    if (s.phase === PHASE_WIN || s.phase === PHASE_LOSS) return true;
  }
  if (s.phase === 'player') duel.endPlayerTurn(weakEnemy);
  return s.phase === PHASE_WIN || s.phase === PHASE_LOSS;
}

/** Rounds where the player passes every turn, so the opponent wins. */
function passRound(duel) {
  const s = duel.state;
  if (s.phase !== 'player') return false;
  duel.endPlayerTurn(false);
  return s.phase === PHASE_WIN || s.phase === PHASE_LOSS;
}

/**
 * Set `duel` to the named scene (start, play, win or loss; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, duel) {
  duel.start();
  const s = duel.state;
  if (name === 'play') {
    for (let round = 0; round < PLAY_ROUNDS; round += 1) {
      if (playRound(duel, false)) break;
    }
    return { screen: s.phase === PHASE_WIN ? SCREEN_WIN : s.phase === PHASE_LOSS ? SCREEN_LOSS : SCREEN_PLAY, best: 0 };
  }
  if (name === 'win') {
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      // A weak opponent for the first stretch; if the duel drags on, it
      // stops playing entirely, so the win is only a matter of turns.
      if (playRound(duel, round >= 12)) return { screen: SCREEN_WIN, best: 0 };
      if (s.phase === PHASE_WIN) return { screen: SCREEN_WIN, best: 0 };
    }
    return { screen: SCREEN_WIN, best: 0 };
  }
  if (name === 'loss') {
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      if (passRound(duel)) break;
    }
    return { screen: s.phase === PHASE_LOSS ? SCREEN_LOSS : SCREEN_PLAY, best: 0 };
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
