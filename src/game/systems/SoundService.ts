// WebAudio で全 SE を自前合成する。外部音源は使わない。
// AudioContext はユーザ操作後でないと再生されないため、
// 最初のクリック/キー押下で unlock() を呼んでもらう。

export type SoundName =
  | 'pickup'
  | 'pickupCombo'
  | 'sortGood'
  | 'sortBad'
  | 'jump'
  | 'land'
  | 'hit'
  | 'slip'
  | 'bagUpgrade'
  | 'goal'
  | 'button'
  | 'hover';

type Wave = OscillatorType;

interface AudioCtxConstructor {
  new (): AudioContext;
}

class SoundServiceImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private lastPlayAt: Partial<Record<SoundName, number>> = {};

  // ユーザ操作後に呼ぶ。AudioContext を初期化／レジューム。
  unlock(): void {
    this.ensureContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return !this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  play(name: SoundName): void {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx || !this.master) return;

    // スパム防止（同名は 30ms クールダウン）
    const now = this.ctx.currentTime;
    const prev = this.lastPlayAt[name] ?? -Infinity;
    if (now - prev < 0.03) return;
    this.lastPlayAt[name] = now;

    switch (name) {
      case 'pickup':
        this.sweep(620, 880, 0.08, 'triangle', 0.35);
        break;
      case 'pickupCombo':
        this.sweep(700, 1100, 0.09, 'triangle', 0.4);
        this.sweep(880, 1320, 0.09, 'sine', 0.25, 0.04);
        break;
      case 'sortGood':
        this.melody([523, 659, 784], 0.09, 'triangle', 0.4);
        break;
      case 'sortBad':
        this.sweep(280, 180, 0.18, 'sawtooth', 0.25);
        break;
      case 'jump':
        this.sweep(520, 760, 0.07, 'square', 0.18);
        break;
      case 'land':
        this.sweep(200, 130, 0.06, 'sine', 0.22);
        break;
      case 'hit':
        this.sweep(280, 90, 0.18, 'square', 0.32);
        break;
      case 'slip':
        this.sweep(560, 320, 0.18, 'triangle', 0.22);
        break;
      case 'bagUpgrade':
        this.melody([523, 659, 880, 1175], 0.07, 'sine', 0.32);
        break;
      case 'goal':
        this.melody([523, 659, 784, 1046, 1568], 0.13, 'triangle', 0.5);
        break;
      case 'button':
        this.sweep(880, 1320, 0.06, 'triangle', 0.18);
        break;
      case 'hover':
        this.sweep(720, 900, 0.04, 'sine', 0.08);
        break;
    }
  }

  private ensureContext(): void {
    if (this.ctx) return;
    const w = window as unknown as { AudioContext?: AudioCtxConstructor; webkitAudioContext?: AudioCtxConstructor };
    const AC = w.AudioContext || w.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18; // 控えめな全体音量
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  private sweep(
    freqFrom: number,
    freqTo: number,
    dur: number,
    type: Wave,
    peak: number,
    delay = 0
  ): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqTo), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private melody(freqs: number[], stepDur: number, type: Wave, peak: number): void {
    if (!this.ctx || !this.master) return;
    let t = 0;
    for (const f of freqs) {
      this.sweep(f, f, stepDur, type, peak, t);
      t += stepDur * 0.85;
    }
  }
}

export const Sound = new SoundServiceImpl();
