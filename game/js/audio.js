// All sound is synthesized with WebAudio — no audio files, no network.
// Footsteps, coin clinks, pickup chimes, alarm stings and a low night hum.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.ambient = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startAmbient();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  startAmbient() {
    // A quiet low drone: the museum at night.
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.035;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    lfo.start();
    this.ambient = { osc, lfo };
  }

  blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noiseBurst(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 900;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
  }

  footstep(loud) {
    this.noiseBurst(0.07, loud ? 0.16 : 0.05, loud ? 1400 : 500);
  }

  guardStep() {
    this.noiseBurst(0.06, 0.045, 420);
  }

  coinThrow() {
    this.blip(1400, 0.12, 'sine', 0.08, 900);
  }

  coinClink() {
    this.blip(2400, 0.25, 'triangle', 0.14, 1800);
    setTimeout(() => this.blip(3100, 0.18, 'triangle', 0.08, 2600), 70);
  }

  pickup() {
    this.blip(880, 0.12, 'sine', 0.12);
    setTimeout(() => this.blip(1320, 0.18, 'sine', 0.12), 90);
  }

  artifact() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'sine', 0.13), i * 90));
  }

  noticed() {
    this.blip(620, 0.16, 'square', 0.07, 740);
  }

  alarm() {
    this.blip(220, 0.5, 'sawtooth', 0.14, 440);
    setTimeout(() => this.blip(330, 0.4, 'sawtooth', 0.12, 520), 160);
  }

  caught() {
    [392, 311, 233].forEach((f, i) => setTimeout(() => this.blip(f, 0.35, 'sawtooth', 0.13), i * 140));
  }

  levelClear() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this.blip(f, 0.35, 'triangle', 0.12), i * 110));
  }

  exitOpen() {
    this.blip(300, 0.5, 'sine', 0.1, 900);
  }
}
