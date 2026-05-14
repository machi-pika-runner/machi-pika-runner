// デバッグ診断モジュール。?debug=1 の時だけ実体が動き、本番では No-op。
// フリーズの原因切り分け専用。ゲーム挙動は変えない。

export interface FrameSnapshot {
  // タイミング
  frame: number;
  now: number;
  delta: number;
  elapsed: number;

  // シーン
  levelIndex: number;
  scenePaused: boolean;
  sceneActive: boolean;
  sceneSleeping: boolean;
  physicsPaused: boolean;
  paused: boolean;
  isOver: boolean;
  resultSent: boolean;
  tickCalls: number;

  // プレイヤー本体
  px: number;
  py: number;
  pActive: boolean;
  pVisible: boolean;
  pAlpha: number;
  pScaleX: number;
  pScaleY: number;
  pState: string;

  // 物理ボディ
  bEnable: boolean;
  bMoves: boolean;
  bImmovable: boolean;
  bAllowGravity: boolean;
  bEmbedded: boolean;
  bBlocked: { up: boolean; down: boolean; left: boolean; right: boolean };
  bTouching: { up: boolean; down: boolean; left: boolean; right: boolean };
  bVelX: number;
  bVelY: number;
  bAccelX: number;
  bAccelY: number;

  // 入力
  inputLeft: boolean;
  inputRight: boolean;
  inputJump: boolean;
  inputDuck: boolean;
  inputPickup: boolean;
  inputSort: boolean;
  inputAction: boolean;
  inputPause: boolean;
  inputRestart: boolean;

  // Player.tick 内訳
  calcVx: number;
  speed: number;
  crouching: boolean;
  slipUntil: number;
  slipFactor: number;
  onGround: boolean;
  beforeVelX: number; // setVelocityX 直前
  afterVelX: number; // setVelocityX 直後
  beforeX: number;
  dx: number; // afterX - beforeX (前フレーム差分)

  // 袋
  held: number;
  capacity: number;
}

export interface DebugEvent {
  time: number;
  msg: string;
  data?: unknown;
}

export interface PlayerTickPartial {
  inputLeft: boolean;
  inputRight: boolean;
  inputJump: boolean;
  inputDuck: boolean;
  speed: number;
  crouching: boolean;
  slipUntil: number;
  slipFactor: number;
  onGround: boolean;
  calcVx: number;
  beforeVelX: number;
  afterVelX: number;
  pState: string;
  px: number;
  py: number;
  pScaleX: number;
  pScaleY: number;
  bEnable: boolean;
  bMoves: boolean;
  bImmovable: boolean;
  bAllowGravity: boolean;
  bEmbedded: boolean;
  bBlocked: { up: boolean; down: boolean; left: boolean; right: boolean };
  bTouching: { up: boolean; down: boolean; left: boolean; right: boolean };
  bVelX: number;
  bVelY: number;
  bAccelX: number;
  bAccelY: number;
}

const MAX_FRAMES = 300;
const MAX_EVENTS = 50;

class DebugDiagnostics {
  enabled = false;
  noScaleTween = false;

  private frames: FrameSnapshot[] = [];
  private events: DebugEvent[] = [];

  private tickCount = 0;
  private frameCount = 0;
  private lastPlayerX = 0;
  private lastPlayerXChangedAt = 0;
  private inputActiveSinceMs = -1;
  private lastWarnAt = 0;
  // 直近の Player.tick 結果を一時保存（GameScene.update 側で snapshot に合成）
  private pendingTick: PlayerTickPartial | null = null;

  init(opts: { enabled: boolean; noScaleTween: boolean }): void {
    this.enabled = opts.enabled;
    this.noScaleTween = opts.noScaleTween;
    if (this.enabled) {
      // 起動直後の記録
      this.events.push({ time: Date.now(), msg: 'debug-init', data: { noScaleTween: this.noScaleTween } });
      // eslint-disable-next-line no-console
      console.warn(`[MACHI_DEBUG] enabled (noScaleTween=${this.noScaleTween})`);
    }
  }

  incTick(): void {
    if (!this.enabled) return;
    this.tickCount++;
  }

  // Player.tick から呼ぶ。GameScene.update の終盤で snapshot に取り込まれる。
  recordPlayerTick(p: PlayerTickPartial): void {
    if (!this.enabled) return;
    this.pendingTick = p;
  }

  // GameScene.update から呼ぶ。1 フレーム分の完成 snapshot を作成しリングに格納。
  // base は scene 側のフォールバック値。pendingTick があればプレイヤー関連はそちらで上書き。
  recordFrame(base: Omit<FrameSnapshot, 'frame' | 'tickCalls' | 'dx' | 'calcVx' | 'speed' | 'crouching' | 'slipUntil' | 'slipFactor' | 'onGround' | 'beforeVelX' | 'afterVelX' | 'beforeX'>): FrameSnapshot | null {
    if (!this.enabled) return null;
    this.frameCount++;
    const tk = this.pendingTick;
    const dx = tk ? (tk.px - this.lastPlayerX) : 0;
    const snap: FrameSnapshot = {
      frame: this.frameCount,
      now: base.now,
      delta: base.delta,
      elapsed: base.elapsed,
      levelIndex: base.levelIndex,
      scenePaused: base.scenePaused,
      sceneActive: base.sceneActive,
      sceneSleeping: base.sceneSleeping,
      physicsPaused: base.physicsPaused,
      paused: base.paused,
      isOver: base.isOver,
      resultSent: base.resultSent,
      tickCalls: this.tickCount,
      px: tk?.px ?? base.px,
      py: tk?.py ?? base.py,
      pActive: base.pActive,
      pVisible: base.pVisible,
      pAlpha: base.pAlpha,
      pScaleX: tk?.pScaleX ?? base.pScaleX,
      pScaleY: tk?.pScaleY ?? base.pScaleY,
      pState: tk?.pState ?? base.pState,
      bEnable: tk?.bEnable ?? base.bEnable,
      bMoves: tk?.bMoves ?? base.bMoves,
      bImmovable: tk?.bImmovable ?? base.bImmovable,
      bAllowGravity: tk?.bAllowGravity ?? base.bAllowGravity,
      bEmbedded: tk?.bEmbedded ?? base.bEmbedded,
      bBlocked: tk?.bBlocked ?? base.bBlocked,
      bTouching: tk?.bTouching ?? base.bTouching,
      bVelX: tk?.bVelX ?? base.bVelX,
      bVelY: tk?.bVelY ?? base.bVelY,
      bAccelX: tk?.bAccelX ?? base.bAccelX,
      bAccelY: tk?.bAccelY ?? base.bAccelY,
      inputLeft: base.inputLeft,
      inputRight: base.inputRight,
      inputJump: base.inputJump,
      inputDuck: base.inputDuck,
      inputPickup: base.inputPickup,
      inputSort: base.inputSort,
      inputAction: base.inputAction,
      inputPause: base.inputPause,
      inputRestart: base.inputRestart,
      calcVx: tk?.calcVx ?? 0,
      speed: tk?.speed ?? 0,
      crouching: tk?.crouching ?? false,
      slipUntil: tk?.slipUntil ?? 0,
      slipFactor: tk?.slipFactor ?? 1,
      onGround: tk?.onGround ?? false,
      beforeVelX: tk?.beforeVelX ?? 0,
      afterVelX: tk?.afterVelX ?? 0,
      beforeX: this.lastPlayerX,
      dx,
      held: base.held,
      capacity: base.capacity
    };
    this.frames.push(snap);
    if (this.frames.length > MAX_FRAMES) this.frames.shift();

    // watchdog
    this.checkWatchdog(snap);

    this.lastPlayerX = snap.px;
    this.pendingTick = null;
    return snap;
  }

  pushEvent(msg: string, data?: unknown): void {
    if (!this.enabled) return;
    this.events.push({ time: Date.now(), msg, data });
    if (this.events.length > MAX_EVENTS) this.events.shift();
  }

  private checkWatchdog(snap: FrameSnapshot): void {
    const now = snap.now;
    const inputHorz = snap.inputLeft || snap.inputRight;
    if (inputHorz) {
      if (this.inputActiveSinceMs < 0) this.inputActiveSinceMs = now;
    } else {
      this.inputActiveSinceMs = -1;
    }
    if (Math.abs(snap.dx) > 0.5) {
      this.lastPlayerXChangedAt = now;
    } else if (this.lastPlayerXChangedAt === 0) {
      this.lastPlayerXChangedAt = now;
    }

    // 同一原因で連続警告しない（2 秒クールダウン）
    const canWarn = now - this.lastWarnAt > 2000;
    if (!canWarn) return;

    const triggered: string[] = [];

    // A) 入力 true なのに 500ms 以上 x が動かない
    if (
      inputHorz &&
      this.inputActiveSinceMs > 0 &&
      now - this.inputActiveSinceMs > 500 &&
      now - this.lastPlayerXChangedAt > 500
    ) {
      triggered.push('A: left/right=true but player.x unchanged >500ms');
    }
    // B) 入力 true なのに calcVx が 0
    if (inputHorz && snap.calcVx === 0) {
      triggered.push('B: input true but calcVx=0');
    }
    // C) calcVx != 0 なのに body.velocity.x が 0
    if (snap.calcVx !== 0 && Math.abs(snap.afterVelX) < 0.01) {
      triggered.push('C: calcVx!=0 but body.velocity.x=0');
    }
    // D) body.velocity.x != 0 なのに x が変化しない
    if (Math.abs(snap.afterVelX) > 0.5 && Math.abs(snap.dx) < 0.1) {
      triggered.push('D: body.velocity.x!=0 but player.x unchanged');
    }
    // E) paused=false かつ isOver=false なのに physics.world.isPaused=true
    if (!snap.paused && !snap.isOver && snap.physicsPaused) {
      triggered.push('E: physics.world.isPaused=true unexpectedly');
    }
    // F) body.enable=false または body.moves=false
    if (!snap.bEnable || !snap.bMoves) {
      triggered.push(`F: bEnable=${snap.bEnable} bMoves=${snap.bMoves}`);
    }

    if (triggered.length > 0) {
      this.lastWarnAt = now;
      // eslint-disable-next-line no-console
      console.warn(
        '[MACHI_DEBUG] FREEZE SUSPECT',
        '\n  conditions:', triggered,
        '\n  snapshot:', snap,
        '\n  last 30 frames:', this.frames.slice(-30),
        '\n  last 20 events:', this.events.slice(-20)
      );
    }
  }

  dump(): unknown {
    const data = {
      enabled: this.enabled,
      noScaleTween: this.noScaleTween,
      frameCount: this.frameCount,
      tickCount: this.tickCount,
      currentSnapshot: this.frames[this.frames.length - 1] ?? null,
      lastFrames: this.frames.slice(-30),
      lastEvents: this.events.slice(-20)
    };
    // eslint-disable-next-line no-console
    console.warn('[MACHI_DEBUG] dump', data);
    return data;
  }

  lastFrames(n = 30): FrameSnapshot[] {
    return this.frames.slice(-n);
  }
  lastEvents(n = 20): DebugEvent[] {
    return this.events.slice(-n);
  }
  getCurrentSnapshot(): FrameSnapshot | null {
    return this.frames[this.frames.length - 1] ?? null;
  }
}

export const Debug = new DebugDiagnostics();
