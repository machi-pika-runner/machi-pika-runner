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

  // BGM スケジューラ
  private bgmActive = false;
  private bgmTimer?: ReturnType<typeof setTimeout>;
  private bgmStep = 0;
  private bgmNextTime = 0;
  private bgmL1?: GainNode; // 常時：ベースライン
  private bgmL2?: GainNode; // 50%以上：メロディ
  private bgmL3?: GainNode; // 75%以上：ハーモニー

  // G メジャー・ペンタトニック（G2=98, D3=147, G3=196, A3=220, B3=247, D4=293, E4=329, G4=392）
  private static BGM_BASS  = [98,  0, 147,  0, 98,  0, 147,  0];
  private static BGM_LEAD  = [392, 0, 440, 392, 329, 0, 392,  0];
  private static BGM_PAD   = [196, 247, 0, 293, 196, 0, 247, 293];

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

  // BGM 開始（GameScene から呼ぶ）
  startBgm(): void {
    if (this.bgmActive) return;
    this.ensureContext();
    if (!this.ctx || !this.master) return;

    this.bgmL1 = this.ctx.createGain(); this.bgmL1.gain.value = 0.30;
    this.bgmL2 = this.ctx.createGain(); this.bgmL2.gain.value = 0.0001;
    this.bgmL3 = this.ctx.createGain(); this.bgmL3.gain.value = 0.0001;
    this.bgmL1.connect(this.master);
    this.bgmL2.connect(this.master);
    this.bgmL3.connect(this.master);

    this.bgmActive = true;
    this.bgmStep = 0;
    this.bgmNextTime = this.ctx.currentTime + 0.1;
    this.scheduleBgm();
  }

  stopBgm(): void {
    this.bgmActive = false;
    if (this.bgmTimer !== undefined) { clearTimeout(this.bgmTimer); this.bgmTimer = undefined; }
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [this.bgmL1, this.bgmL2, this.bgmL3].forEach((g) => {
      if (!g) return;
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0.0001, t + 0.5);
    });
  }

  // クリーン度に応じてレイヤを徐々にフェードイン/アウト
  setBgmCleanliness(pct: number): void {
    if (!this.ctx || !this.bgmL2 || !this.bgmL3) return;
    const t = this.ctx.currentTime;
    const ramp = 2.0;
    const v2 = pct >= 50 ? 0.24 : 0.0001;
    const v3 = pct >= 75 ? 0.16 : 0.0001;
    this.bgmL2.gain.cancelScheduledValues(t);
    this.bgmL3.gain.cancelScheduledValues(t);
    this.bgmL2.gain.setValueAtTime(this.bgmL2.gain.value, t);
    this.bgmL3.gain.setValueAtTime(this.bgmL3.gain.value, t);
    this.bgmL2.gain.linearRampToValueAtTime(v2, t + ramp);
    this.bgmL3.gain.linearRampToValueAtTime(v3, t + ramp);
  }

  private scheduleBgm(): void {
    if (!this.bgmActive || !this.ctx) return;
    try {
      const STEP = 0.20; // 8th note at ~150BPM
      const AHEAD = 0.22;
      // 暴走防止：1 回のスケジュールで最大 16 ステップに制限
      let budget = 16;
      while (this.bgmNextTime < this.ctx.currentTime + AHEAD && budget-- > 0) {
        const i = this.bgmStep % 8;
        const t = this.bgmNextTime;
        const b = SoundServiceImpl.BGM_BASS[i];
        const m = SoundServiceImpl.BGM_LEAD[i];
        const p = SoundServiceImpl.BGM_PAD[i];
        if (b && this.bgmL1) this.bgmNote(b, STEP * 0.75, 'sine',     this.bgmL1, t);
        if (m && this.bgmL2) this.bgmNote(m, STEP * 0.55, 'triangle', this.bgmL2, t);
        if (p && this.bgmL3) this.bgmNote(p, STEP * 0.85, 'sine',     this.bgmL3, t);
        this.bgmStep++;
        this.bgmNextTime += STEP;
      }
    } catch {
      // ノードがクローズされた等で例外が出ても BGM だけ停止し、ゲームには影響させない
      this.bgmActive = false;
      return;
    }
    if (this.bgmActive) this.bgmTimer = setTimeout(() => this.scheduleBgm(), 60);
  }

  private bgmNote(
    freq: number, dur: number, type: OscillatorType,
    dest: GainNode, startTime: number
  ): void {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.85, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
      osc.connect(gain).connect(dest);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.01);
    } catch {
      /* 単音失敗は無視 */
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
