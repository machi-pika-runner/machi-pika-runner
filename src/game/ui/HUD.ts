import Phaser from 'phaser';
import { Depth, GAME_WIDTH, BAG_INITIAL_CAPACITY, TIME_LIMIT_SEC, getComboTier } from '../constants';
import { TRASH_TYPES, type TrashKind } from '../data/trashTypes';
import { Sound } from '../systems/SoundService';
import { saveMuted } from '../utils/storage';

// 上部HUD: スコア / クリーン度 / 時間 / ゴミ袋 / コンボ / ライフ
// scrollFactor=0 で固定表示。
export class HUD {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private scoreText: Phaser.GameObjects.Text;
  private timeText: Phaser.GameObjects.Text;
  private bagText: Phaser.GameObjects.Text;
  private comboText: Phaser.GameObjects.Text;
  private multiplierBadge: Phaser.GameObjects.Text;
  private muteToggle!: Phaser.GameObjects.Text;
  private lifeText: Phaser.GameObjects.Text;
  private cleanlinessFill: Phaser.GameObjects.Rectangle;
  private cleanlinessLabel: Phaser.GameObjects.Text;
  private heldText: Phaser.GameObjects.Text;
  private toastText: Phaser.GameObjects.Text;
  private toastTimer?: Phaser.Time.TimerEvent;
  private bagPulse?: Phaser.Tweens.Tween;
  private bagFull = false;

  private cleanlinessMax = 100;
  private barWidth = 320;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(Depth.Hud);

    // 半透明バー
    // 上部HUD帯（半透明＋下端に薄い金色のアクセント線）
    const bar = scene.add.rectangle(0, 0, GAME_WIDTH, 64, 0x10131c, 0.62).setOrigin(0, 0);
    const accent = scene.add.rectangle(0, 64, GAME_WIDTH, 2, 0xffe066, 0.55).setOrigin(0, 0);
    this.root.add(bar);
    this.root.add(accent);

    this.scoreText = scene.add
      .text(20, 16, 'SCORE 0', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffe066',
        fontStyle: 'bold'
      });
    this.root.add(this.scoreText);

    this.comboText = scene.add
      .text(20, 42, 'COMBO 0', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffd1ec'
      });
    this.root.add(this.comboText);

    // コンボ倍率バッジ（x1.0 時は非表示）
    this.multiplierBadge = scene.add
      .text(118, 41, '', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#10131c',
        backgroundColor: '#ffe066',
        padding: { x: 6, y: 2 },
        fontStyle: 'bold'
      })
      .setAlpha(0);
    this.root.add(this.multiplierBadge);

    // 中央: クリーン度
    this.cleanlinessLabel = scene.add
      .text(GAME_WIDTH / 2, 14, '街のクリーン度', {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#ffffff'
      })
      .setOrigin(0.5, 0);
    this.root.add(this.cleanlinessLabel);

    const barX = GAME_WIDTH / 2 - this.barWidth / 2;
    const barY = 32;
    const barBg = scene.add
      .rectangle(barX, barY, this.barWidth, 18, 0x000000, 0.4)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffffff, 0.6);
    this.cleanlinessFill = scene.add
      .rectangle(barX + 2, barY + 2, this.barWidth - 4, 14, 0x66c674, 1)
      .setOrigin(0, 0);
    this.root.add(barBg);
    this.root.add(this.cleanlinessFill);

    // 右: 時間 / 袋 / ライフ
    this.timeText = scene.add
      .text(GAME_WIDTH - 20, 8, `TIME ${TIME_LIMIT_SEC}`, {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold'
      })
      .setOrigin(1, 0);
    this.root.add(this.timeText);

    this.bagText = scene.add
      .text(GAME_WIDTH - 20, 32, `袋 0/${BAG_INITIAL_CAPACITY}`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#a6e3ff'
      })
      .setOrigin(1, 0);
    this.root.add(this.bagText);

    this.lifeText = scene.add
      .text(GAME_WIDTH - 20, 50, '♥♥♥', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ff7a8a'
      })
      .setOrigin(1, 0);
    this.root.add(this.lifeText);

    // ミュートトグル（右上隅）
    this.muteToggle = scene.add
      .text(GAME_WIDTH - 86, 8, Sound.isMuted() ? '🔇 MUTE' : '🔊 ON', {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#10131caa',
        padding: { x: 6, y: 2 }
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.muteToggle.on('pointerdown', () => {
      const audible = Sound.toggleMute();
      this.muteToggle.setText(audible ? '🔊 ON' : '🔇 MUTE');
      saveMuted(!audible);
    });
    this.root.add(this.muteToggle);

    // 直近のゴミ（手持ち先頭）
    this.heldText = scene.add
      .text(20, 76, '手持ち：なし', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 }
      })
      .setScrollFactor(0)
      .setDepth(Depth.Hud);

    // トースト（中央下）
    this.toastText = scene.add
      .text(GAME_WIDTH / 2, 110, '', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 14, y: 6 },
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(Depth.Hud)
      .setAlpha(0);
  }

  setScore(v: number): void {
    this.scoreText.setText(`SCORE ${v.toLocaleString()}`);
  }

  setCleanliness(v: number): void {
    const ratio = Phaser.Math.Clamp(v / this.cleanlinessMax, 0, 1);
    this.cleanlinessFill.width = (this.barWidth - 4) * ratio;
    let color = 0x66c674;
    if (ratio < 0.6) color = 0xeebb44;
    if (ratio < 0.4) color = 0xee5a5a;
    this.cleanlinessFill.fillColor = color;
  }

  setTime(sec: number): void {
    const s = Math.max(0, Math.ceil(sec));
    this.timeText.setText(`TIME ${s}`);
    this.timeText.setColor(s <= 15 ? '#ff8080' : '#ffffff');
  }

  setBag(count: number, capacity: number): void {
    this.bagText.setText(`袋 ${count}/${capacity}`);
    const full = count >= capacity;
    if (full !== this.bagFull) {
      this.bagFull = full;
      if (full) {
        this.bagText.setColor('#ff8080');
        this.bagPulse = this.scene.tweens.add({
          targets: this.bagText,
          alpha: { from: 1, to: 0.4 },
          duration: 280,
          yoyo: true,
          repeat: -1
        });
      } else {
        this.bagText.setColor('#a6e3ff');
        this.bagText.setAlpha(1);
        this.bagPulse?.stop();
        this.bagPulse = undefined;
      }
    }
  }

  setLife(life: number): void {
    this.lifeText.setText('♥'.repeat(Math.max(0, life)) + '♡'.repeat(Math.max(0, 3 - life)));
  }

  setCombo(c: number): void {
    if (c <= 1) this.comboText.setText('COMBO 0');
    else this.comboText.setText(`COMBO ${c}!`);
    // 倍率バッジ
    const tier = getComboTier(c);
    if (tier.multiplier > 1) {
      this.multiplierBadge.setText(`x${tier.multiplier}`);
      this.multiplierBadge.setBackgroundColor(tier.color);
      this.multiplierBadge.setAlpha(1);
    } else {
      this.multiplierBadge.setAlpha(0);
    }
  }

  setHeld(top: TrashKind | null, total: number): void {
    if (!top) {
      this.heldText.setText('手持ち：なし');
    } else {
      this.heldText.setText(`手持ち：${TRASH_TYPES[top].label}（×${total}）`);
    }
  }

  toast(msg: string, color = '#ffffff', durationMs = 1100): void {
    this.toastText.setText(msg);
    this.toastText.setColor(color);
    this.toastText.setAlpha(1);
    this.toastTimer?.remove();
    this.toastTimer = this.scene.time.delayedCall(durationMs, () => {
      this.scene.tweens.add({ targets: this.toastText, alpha: 0, duration: 280 });
    });
  }
}
