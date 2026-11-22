// Keyboard and pointer input. One-shot presses (start, end turn, play a card)
// are queued as flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice. Pointer position is tracked
// for card hover; clicks are delivered as canvas coordinates.
export const ACTION_CONFIRM = 1;
export const ACTION_END_TURN = 2;

const CONFIRM = new Set(['Space', 'Enter']);
const END_TURN = new Set(['KeyE']);

export function createInput(canvas) {
  let actions = 0;
  let pointer = { x: -1, y: -1, clicked: false, clickX: 0, clickY: 0 };
  let digit = -1;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (END_TURN.has(event.code)) {
      if (!event.repeat) actions |= ACTION_END_TURN;
    } else if (event.code.startsWith('Digit')) {
      const n = Number(event.code.slice(5));
      if (n >= 1 && n <= 7 && !event.repeat) digit = n - 1;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('blur', () => {
    actions = 0;
    digit = -1;
  });

  function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  canvas.addEventListener('pointermove', (event) => {
    const p = toCanvas(event);
    pointer.x = p.x;
    pointer.y = p.y;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const p = toCanvas(event);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.clicked = true;
    pointer.clickX = p.x;
    pointer.clickY = p.y;
    actions |= ACTION_CONFIRM;
  });

  return {
    pointer() {
      return pointer;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeDigit() {
      const taken = digit;
      digit = -1;
      return taken;
    },
    takeClick() {
      if (!pointer.clicked) return null;
      pointer.clicked = false;
      return { x: pointer.clickX, y: pointer.clickY };
    },
  };
}
