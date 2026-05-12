import Phaser from 'phaser';
import { InputManager } from '../systems/InputManager';
import { Sound } from '../systems/SoundService';
import {
  Depth,
  PLAYER_SPEED,
  PLAYER_SPEED_DUCK,
  PLAYER_JUMP_VELOCITY,
  PLAYER_INITIAL_LIFE,
  PLAYER_INVINCIBLE_MS,
  PLAYER_KNOCKBACK_X,
  PLAYER_KNOCKBACK_Y,
  Tex
} from '../constants';

export type PlayerState = 'idle' | 'run' | 'jump' | 'duck' | 'hurt';

// 操作感を底上げするためのフレーム外パラメタ
const COYOTE_MS = 120; // 地面を離れた直後でもジャンプを受け付ける猶予
const JUMP_BUFFER_MS = 130; // 着地直前のジャンプ入力を覚えておく時間
const JUMP_CUT_FACTOR = 0.42; // ジャンプ中に Space を離した時の上昇カット率
const FULL_INDICATOR_OFFSET_Y = 100;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private inputMgr!: InputManager;
  private _life = PLAYER_INITIAL_LIFE;
  private _invincibleUntil = 0;
  private _state: PlayerState = 'idle';
  private _slipUntil = 0;
  private _slipFactor = 1;
  private _facing: 1 | -1 = 1;
  private _crouching = false;

  // ジャンプ拡張用
  private _lastGroundedAt = -Infinity;
  private _lastJumpRequestedAt = -Infinity;
  private _isAscending = false;
  private _wasOnGround = true;

  // 袋満杯インジケータ（頭上「FULL!」）
  private fullIndicator?: Phaser.GameObjects.Text;
  private _bagFull = false;

  // 無敵リング（被弾中の視認性用）
  private invincibleRing?: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, Tex.PlayerIdle);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(Depth.Player);
    this.setCollideWorldBounds(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(36, 76);
    body.setOffset(10, 4);
  }

  bindInput(input: InputManager): void {
    this.inputMgr = input;
  }

  get life(): number {
    return this._life;
  }
  get isInvincible(): boolean {
    return this.scene.time.now < this._invincibleUntil;
  }
  get isCrouching(): boolean {
    return this._crouching;
  }
  get facing(): 1 | -1 {
    return this._facing;
  }

  // 公開: ゴミ拾いの判定円中心
  getPickupCenter(): { x: number; y: number } {
    return { x: this.x, y: this.y - 40 };
  }

  // ダメージ処理（無敵中は無視）。生存していれば true。
  takeDamage(): boolean {
    if (this.isInvincible) return false;
    this._life = Math.max(0, this._life - 1);
    this._invincibleUntil = this.scene.time.now + PLAYER_INVINCIBLE_MS;
    this.applyState('hurt');
    this.setTint(0xff5577);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(this._facing * -PLAYER_KNOCKBACK_X, PLAYER_KNOCKBACK_Y);
    Sound.play('hit');
    this.scene.time.delayedCall(220, () => this.clearTint());
    // 高速点滅（無敵時間内）
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.3, to: 1 },
      duration: 90,
      yoyo: true,
      repeat: 5
    });
    // 足元の黄色リングが無敵時間の残量を可視化
    this.invincibleRing?.destroy();
    this.invincibleRing = this.scene.add
      .arc(this.x, this.y - 6, 30, 0, 360, false, 0xffe066, 0.5)
      .setStrokeStyle(3, 0xffe066, 0.9)
      .setDepth(Depth.Player - 1);
    this.scene.tweens.add({
      targets: this.invincibleRing,
      scale: { from: 0.6, to: 1.4 },
      alpha: { from: 0.9, to: 0 },
      duration: PLAYER_INVINCIBLE_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.invincibleRing?.destroy();
        this.invincibleRing = undefined;
      }
    });
    return this._life > 0;
  }

  // 滑る効果（水たまり）。一定時間、減速する。
  applySlip(durationMs = 600, factor = 0.5): void {
    this._slipUntil = this.scene.time.now + durationMs;
    this._slipFactor = factor;
    Sound.play('slip');
  }

  // 袋満杯時の頭上表示。GameScene から状態が変わるたびに呼ばれる。
  setBagFull(full: boolean): void {
    if (this._bagFull === full) return;
    this._bagFull = full;
    if (full) {
      if (!this.fullIndicator) {
        this.fullIndicator = this.scene.add
          .text(this.x, this.y - FULL_INDICATOR_OFFSET_Y, 'FULL!', {
            fontFamily: 'sans-serif',
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#d33d3d',
            padding: { x: 6, y: 2 },
            fontStyle: 'bold'
          })
          .setOrigin(0.5)
          .setDepth(Depth.Particle);
        this.scene.tweens.add({
          targets: this.fullIndicator,
          y: '-=4',
          yoyo: true,
          repeat: -1,
          duration: 320,
          ease: 'Sine.easeInOut'
        });
      }
      this.fullIndicator.setVisible(true);
    } else {
      this.fullIndicator?.setVisible(false);
    }
  }

  destroy(fromScene?: boolean): void {
    this.fullIndicator?.destroy();
    this.invincibleRing?.destroy();
    super.destroy(fromScene);
  }

  // ステージ更新ループから呼ぶ
  tick(): void {
    if (!this.inputMgr) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down || body.touching.down;

    // しゃがみ
    const wantDuck = this.inputMgr.isDown('duck') && onGround;
    if (wantDuck !== this._crouching) {
      this._crouching = wantDuck;
      if (wantDuck) {
        body.setSize(40, 50);
        body.setOffset(8, 30);
      } else {
        body.setSize(36, 76);
        body.setOffset(10, 4);
      }
    }

    // 横移動
    let speed = this._crouching ? PLAYER_SPEED_DUCK : PLAYER_SPEED;
    if (this.scene.time.now < this._slipUntil) speed *= this._slipFactor;

    let vx = 0;
    if (this.inputMgr.isDown('left')) {
      vx -= speed;
      this._facing = -1;
    }
    if (this.inputMgr.isDown('right')) {
      vx += speed;
      this._facing = 1;
    }
    body.setVelocityX(vx);
    this.setFlipX(this._facing === -1);

    // ── ジャンプ：コヨーテタイム + ジャンプバッファ + 可変高 ──
    const now = this.scene.time.now;
    if (onGround) this._lastGroundedAt = now;
    if (this.inputMgr.justPressed('jump')) this._lastJumpRequestedAt = now;

    const canCoyote = now - this._lastGroundedAt <= COYOTE_MS;
    const hasBuffer = now - this._lastJumpRequestedAt <= JUMP_BUFFER_MS;
    if (hasBuffer && canCoyote && !this._crouching) {
      body.setVelocityY(PLAYER_JUMP_VELOCITY);
      this._lastJumpRequestedAt = -Infinity;
      this._lastGroundedAt = -Infinity;
      this._isAscending = true;
      Sound.play('jump');
      this.scene.tweens.add({
        targets: this,
        scaleY: { from: 1.08, to: 1 },
        scaleX: { from: 0.94, to: 1 },
        duration: 140,
        ease: 'Quad.easeOut'
      });
    }
    // 上昇中に Space を離したら上昇を切る
    if (this._isAscending) {
      if (body.velocity.y >= 0) {
        this._isAscending = false;
      } else if (!this.inputMgr.isDown('jump')) {
        body.setVelocityY(body.velocity.y * JUMP_CUT_FACTOR);
        this._isAscending = false;
      }
    }
    if (onGround) this._isAscending = false;

    // 着地検出（前フレームは空中 → 今は地面）
    if (!this._wasOnGround && onGround && !this.isInvincible) {
      this.onLanding();
    }
    this._wasOnGround = onGround;

    // 状態決定
    let next: PlayerState;
    if (this._state === 'hurt' && this.isInvincible) {
      next = 'hurt';
    } else if (!onGround) {
      next = 'jump';
    } else if (this._crouching) {
      next = 'duck';
    } else if (Math.abs(vx) > 1) {
      next = 'run';
    } else {
      next = 'idle';
    }
    if (next !== this._state) this.applyState(next);

    // 頭上 FULL! 表示の追従
    if (this.fullIndicator && this._bagFull) {
      this.fullIndicator.x = this.x;
      this.fullIndicator.y = this.y - FULL_INDICATOR_OFFSET_Y;
    }
    // 無敵リングの追従
    if (this.invincibleRing) {
      this.invincibleRing.x = this.x;
      this.invincibleRing.y = this.y - 6;
    }
  }

  // 着地演出：足元ダスト + 軽い縦スクワッシュ + SE
  private onLanding(): void {
    Sound.play('land');
    this.scene.tweens.add({
      targets: this,
      scaleY: { from: 0.86, to: 1 },
      scaleX: { from: 1.1, to: 1 },
      duration: 130,
      ease: 'Quad.easeOut'
    });
    this.spawnLandingDust();
  }

  private spawnLandingDust(): void {
    const scene = this.scene;
    for (let i = 0; i < 5; i++) {
      const dx = (i - 2) * 6 + (Math.random() - 0.5) * 6;
      const dust = scene.add
        .circle(this.x + dx, this.y - 2, 4 + Math.random() * 2, 0xffffff, 0.85)
        .setDepth(Depth.Particle - 1);
      scene.tweens.add({
        targets: dust,
        x: dust.x + dx * 4,
        y: dust.y - 8 - Math.random() * 6,
        alpha: 0,
        scale: 0.2,
        duration: 320 + Math.random() * 80,
        ease: 'Cubic.easeOut',
        onComplete: () => dust.destroy()
      });
    }
  }

  private applyState(state: PlayerState): void {
    this._state = state;
    const map: Record<PlayerState, string> = {
      idle: Tex.PlayerIdle,
      run: Tex.PlayerRun,
      jump: Tex.PlayerJump,
      duck: Tex.PlayerDuck,
      hurt: Tex.PlayerHurt
    };
    this.setTexture(map[state]);
  }
}
