// Web Audio API Synthesizer for Wizard Chess Cathedral Sound & Reminder Chimes
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a resonant Gothic Cathedral Bell Chime for turn reminder pings
 */
export function playReminderChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.35, now);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
    masterGain.connect(ctx.destination);

    // Harmonic frequencies of a grand sanctum bell (A4, E5, A5, C#6)
    const bellHarmonics = [
      { freq: 440, gain: 0.5 },
      { freq: 659.25, gain: 0.3 },
      { freq: 880, gain: 0.2 },
      { freq: 1108.73, gain: 0.12 },
    ];

    for (const h of bellHarmonics) {
      const osc = ctx.createOscillator();
      const hGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(h.freq, now);
      hGain.gain.setValueAtTime(h.gain, now);
      hGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
      osc.connect(hGain);
      hGain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 3.0);
    }
  } catch (err) {
    console.warn('Audio chime error:', err);
  }
}

/**
 * Plays a mystical tactical step chime during visual learning simulation
 */
export function playTacticalStepChime(stepIndex = 0) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq = 523.25; // C5
    const pentatonicRatios = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];
    const freq = baseFreq * (pentatonicRatios[stepIndex % pentatonicRatios.length] || 1);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  } catch {}
}
