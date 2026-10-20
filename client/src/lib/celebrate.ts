import confetti from 'canvas-confetti';

const COLORS = ['#6366f1', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#38bdf8'];

/**
 * Confetti bursts in the brand palette. `disableForReducedMotion` honours the OS
 * "reduce motion" setting, so celebrations never get in the way of accessibility.
 */
export function celebrate(
  level: 'small' | 'medium' | 'big' = 'small',
  origin?: { x: number; y: number },
) {
  const base = { colors: COLORS, disableForReducedMotion: true, zIndex: 100, ticks: 220 } as const;
  if (level === 'small') {
    confetti({
      ...base,
      particleCount: 60,
      spread: 70,
      startVelocity: 32,
      scalar: 0.85,
      origin: origin ?? { x: 0.5, y: 0.7 },
    });
    return;
  }
  if (level === 'medium') {
    confetti({
      ...base,
      particleCount: 110,
      spread: 100,
      startVelocity: 42,
      origin: origin ?? { x: 0.5, y: 0.6 },
    });
    return;
  }
  // Big: two side cannons for a chapter finish.
  const end = Date.now() + 900;
  (function frame() {
    confetti({
      ...base,
      particleCount: 6,
      angle: 60,
      spread: 60,
      startVelocity: 55,
      origin: { x: 0, y: 0.75 },
    });
    confetti({
      ...base,
      particleCount: 6,
      angle: 120,
      spread: 60,
      startVelocity: 55,
      origin: { x: 1, y: 0.75 },
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/** Origin for a burst that starts at a given element (e.g. the checkbox that was clicked). */
export function originOf(el: Element | null | undefined) {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return {
    x: (r.left + r.width / 2) / window.innerWidth,
    y: (r.top + r.height / 2) / window.innerHeight,
  };
}
