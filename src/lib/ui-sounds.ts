/** Short UI click for send / confirm — Web Audio, no asset file. */
export function playSendFeedback() {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const t0 = ctx.currentTime;
    osc.frequency.setValueAtTime(920, t0);
    osc.frequency.exponentialRampToValueAtTime(520, t0 + 0.07);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.1, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.13);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    /* ignore autoplay / unsupported */
  }
}
