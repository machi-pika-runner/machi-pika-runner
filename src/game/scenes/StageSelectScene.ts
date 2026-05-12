import Phaser from 'phaser';
import { Depth, GAME_HEIGHT, GAME_WIDTH, SceneKeys, THEME_COLORS } from '../constants';
import { LEVELS, type LevelDef } from '../data/levels';
import { Button } from '../ui/Button';
import { hexString } from '../utils/math';
import { isStageUnlocked, loadClearedStages } from '../utils/storage';
import { Sound } from '../systems/SoundService';

// ステージ選択画面。タイトルから遷移。
// 4 枚のカードを横並びで表示し、ロック状況とクリア記録を出す。
export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.StageSelect);
  }

  create(): void {
    this.cameras.main.fadeIn(220, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#0e1320');

    // 背景の薄いグラデ
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x10131c, 1).setOrigin(0, 0);
    this.add.rectangle(0, 0, GAME_WIDTH, 200, 0x1c2440, 1).setOrigin(0, 0).setAlpha(0.7);

    // タイトル
    this.add
      .text(GAME_WIDTH / 2, 60, 'STAGE SELECT', {
        fontFamily: 'sans-serif',
        fontSize: '42px',
        color: '#ffe066',
        fontStyle: 'bold',
        stroke: '#3a2a00',
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(Depth.Hud);

    this.add
      .text(GAME_WIDTH / 2, 102, 'プレイするステージを選んでね', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(Depth.Hud);

    // カード
    const cleared = loadClearedStages();
    const cardWidth = 270;
    const gap = 18;
    const totalW = LEVELS.length * cardWidth + (LEVELS.length - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + cardWidth / 2;
    const cardY = GAME_HEIGHT / 2 + 20;

    LEVELS.forEach((lv, i) => {
      const x = startX + i * (cardWidth + gap);
      this.buildCard(x, cardY, cardWidth, lv, i, cleared);
    });

    // 戻るボタン
    new Button(this, 90, GAME_HEIGHT - 50, '◀ タイトル', () => this.scene.start(SceneKeys.Title), {
      width: 160,
      height: 40,
      fontSize: 16,
      bg: 0x6c7886,
      bgHover: 0x8a96a3
    }).setDepth(Depth.Hud + 2);

    // ESC でも戻る
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start(SceneKeys.Title));
  }

  private buildCard(
    cx: number,
    cy: number,
    width: number,
    lv: LevelDef,
    idx: number,
    cleared: Record<number, { rank: string; score: number; cleanliness: number }>
  ): void {
    const unlocked = isStageUnlocked(idx);
    const record = cleared[idx];
    const themeC = THEME_COLORS[lv.theme];
    const cardHeight = 360;

    // 背景パネル
    const bg = this.add
      .rectangle(cx, cy, width, cardHeight, 0x1c2233, 0.95)
      .setStrokeStyle(3, unlocked ? themeC.skyClean : 0x4a4a55, 1)
      .setDepth(Depth.Hud);

    // テーマプレビュー帯（上部）
    const previewH = 110;
    const previewBg = this.add
      .rectangle(cx, cy - cardHeight / 2 + previewH / 2 + 4, width - 14, previewH, themeC.bgClean, 1)
      .setDepth(Depth.Hud);

    // テーマアイコン（絵文字代用）
    const themeIcon: Record<string, string> = {
      park: '🌳',
      river: '🌊',
      town: '🏬',
      beach: '🏖️'
    };
    this.add
      .text(cx, cy - cardHeight / 2 + previewH / 2 + 4, themeIcon[lv.theme] ?? '🗺️', {
        fontFamily: 'sans-serif',
        fontSize: '64px'
      })
      .setOrigin(0.5)
      .setDepth(Depth.Hud + 1);

    // ステージ番号
    this.add
      .text(cx - width / 2 + 14, cy - cardHeight / 2 + 14, `STAGE ${idx + 1}`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#10131c',
        backgroundColor: hexString(themeC.skyClean),
        padding: { x: 6, y: 2 },
        fontStyle: 'bold'
      })
      .setOrigin(0, 0)
      .setDepth(Depth.Hud + 1);

    // 名前
    this.add
      .text(cx, cy - cardHeight / 2 + previewH + 24, lv.name, {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(Depth.Hud + 1);

    // サブタイトル
    this.add
      .text(cx, cy - cardHeight / 2 + previewH + 50, lv.subtitle, {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#a6e3ff',
        wordWrap: { width: width - 24 },
        align: 'center'
      })
      .setOrigin(0.5, 0)
      .setDepth(Depth.Hud + 1);

    // ステータス
    const statY = cy - cardHeight / 2 + previewH + 110;
    this.add
      .text(cx, statY, `⏱ 制限 ${lv.timeLimit}秒  /  🎯 目標 ${lv.targetCleanliness}%`, {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setDepth(Depth.Hud + 1);

    // クリア記録
    if (record) {
      this.add
        .text(cx, statY + 22, `BEST ${record.score.toLocaleString()}  ${record.rank}ランク`, {
          fontFamily: 'sans-serif',
          fontSize: '13px',
          color: '#ffe066',
          fontStyle: 'bold'
        })
        .setOrigin(0.5)
        .setDepth(Depth.Hud + 1);
    } else if (unlocked) {
      this.add
        .text(cx, statY + 22, '未クリア', {
          fontFamily: 'sans-serif',
          fontSize: '12px',
          color: '#a6e3ff'
        })
        .setOrigin(0.5)
        .setDepth(Depth.Hud + 1);
    }

    // PLAY / LOCK
    const btnY = cy + cardHeight / 2 - 38;
    if (unlocked) {
      new Button(
        this,
        cx,
        btnY,
        '▶ PLAY',
        () => {
          Sound.unlock();
          this.cameras.main.fadeOut(220, 0, 0, 0);
          this.time.delayedCall(240, () =>
            this.scene.start(SceneKeys.Game, { levelIndex: idx })
          );
        },
        { width: width - 40, height: 44, fontSize: 18, bg: 0xff7a3d, bgHover: 0xffa672 }
      ).setDepth(Depth.Hud + 2);
    } else {
      this.add
        .rectangle(cx, btnY, width - 40, 44, 0x4a4a55, 1)
        .setStrokeStyle(2, 0x6c6c78, 1)
        .setDepth(Depth.Hud + 1);
      this.add
        .text(cx, btnY, '🔒 前のステージをクリアで開放', {
          fontFamily: 'sans-serif',
          fontSize: '12px',
          color: '#aaaaaa'
        })
        .setOrigin(0.5)
        .setDepth(Depth.Hud + 2);
      // パネル全体を暗く
      bg.setAlpha(0.7);
      previewBg.setAlpha(0.5);
    }
  }
}
