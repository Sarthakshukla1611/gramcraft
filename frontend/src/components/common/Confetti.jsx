import confetti from 'canvas-confetti';

export function fireCelebrationConfetti() {
  // Check prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // GramCraft custom turmeric, softgreen and teal confetti colors
  const colors = ['#C4832A', '#7BAE7F', '#2E5A63', '#F6F1E4'];

  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.7 },
    colors,
    disableForReducedMotion: true,
  });

  setTimeout(() => {
    confetti({
      particleCount: 35,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 35,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
      disableForReducedMotion: true,
    });
  }, 150);
}

export default { fireCelebrationConfetti };
