import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SceneKeys, Tex } from '../constants';
import { generateAllTextures } from '../utils/assetFactory';
import { Sound } from '../systems/SoundService';
import { loadMuted } from '../utils/storage';

// 画面サイズ確定 → 仮素材生成 → タイトルへ。
// 外部素材を使わないので preload で読むものは無い。
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    // ロゴ風スプラッシュ
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.cameras.main.setBackgroundColor('#0e1320');

    const title = this.add
      .text(cx, cy - 20, 'まちピカランナー', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#ffe066',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    const sub = this.add
      .text(cx, cy + 30, 'Plogging Quest', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    const note = this.add
      .text(cx, cy + 70, 'loading…', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#a6e3ff'
      })
      .setOrigin(0.5);

    // 仮素材を一気に焼き込む
    generateAllTextures(this);
    // プレイヤーのフレーム切替アニメ（idle/run は 2 フレーム、その他は単フレーム）
    this.registerPlayerAnims();
    // 保存済みのミュート状態を復元
    Sound.setMuted(loadMuted());

    this.tweens.add({
      targets: [title, sub, note],
      alpha: { from: 0, to: 1 },
      duration: 380,
      onComplete: () => {
        this.time.delayedCall(360, () => this.scene.start(SceneKeys.Title));
      }
    });
  }

  // プレイヤーのアニメーションをグローバル登録（GameScene 起動前に呼ばれる）。
  // スプライト切替方式：scale を動かさないので物理ボディ・カスタム tween と無干渉。
  private registerPlayerAnims(): void {
    const reg = (key: string, frames: string[], rate: number, loop: boolean) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: frames.map((k) => ({ key: k })),
        frameRate: rate,
        repeat: loop ? -1 : 0
      });
    };
    reg('player-idle', [Tex.PlayerIdle, Tex.PlayerIdle2], 2, true);
    reg('player-run',  [Tex.PlayerRun,  Tex.PlayerRun2 ], 9, true);
    reg('player-jump', [Tex.PlayerJump], 1, false);
    reg('player-duck', [Tex.PlayerDuck], 1, false);
    reg('player-hurt', [Tex.PlayerHurt], 1, false);
  }
}
