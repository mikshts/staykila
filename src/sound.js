// src/utils/sound.js
export const playExpiringAlert = () => {
  try {
    // Create audio context for modern browsers
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();

    // Create oscillator for a gentle notification sound
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Set frequency for a pleasant alert tone (A4 = 440Hz)
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    oscillator.type = "sine";

    // Volume envelope - fade in and out
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.3);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);

    // Play the tone
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);

    // Play a second tone for attention
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);

      osc2.frequency.setValueAtTime(523, audioCtx.currentTime); // C5
      osc2.type = "sine";

      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
      gain2.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.2);
      gain2.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);

      osc2.start(audioCtx.currentTime);
      osc2.stop(audioCtx.currentTime + 0.3);
    }, 300);
  } catch (error) {
    // Fallback for browsers that don't support Web Audio API
    console.warn("Audio not supported:", error);
    playFallbackSound();
  }
};

// Fallback using Audio element with data URI
const playFallbackSound = () => {
  try {
    // Create a simple beep using Audio element with data URI
    const audio = new Audio();
    const dataUri =
      "data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACBhYqFhYWFiYWFiYWFhYGFhYGFhoaFhYWFhYWFhYWFhoWGhYWFhoWGhoWFhoWGhYWFhoWGhYWFhoWGhoWFhoWGhYWFhoWGhYWFhoWGhYWFhoWGhYWFhoWGhoWFhoWGhYWFhoW";
    audio.src = dataUri;
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch (e) {
    // Silent fallback
  }
};

// Play a more urgent sound for critical alerts
export const playUrgentAlert = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();

    // Play 3 quick beeps
    [0, 200, 400].forEach((delay) => {
      setTimeout(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.type = "square";

        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.15);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.2);
      }, delay);
    });
  } catch (error) {
    console.warn("Urgent alert not supported:", error);
  }
};
