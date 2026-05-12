import Phaser from 'phaser';
import { Depth, GAME_HEIGHT, GAME_WIDTH, SceneKeys, Tex } from '../constants';
import { Button } from '../ui/Button';
import { TRASH_KINDS, TRASH_TYPES } from '../data/trashTypes';
import { loadHighScore } from '../utils/storage';
import { Sound } from '../systems/SoundService';

// 朝の公園・街並みの簡易表現＋大きめロゴ＋START / HOW TO PLAY。
// HOW TO PLAY は同シーン上にオーバーレイで重ねる。
export class TitleScene extends Phaser.Scene {
  private helpOverlay?: Phaser.GameObjects.Container;
  private helpVisible = false;
  private startGuardUntil = 0; // オーバーレイ閉じ直後の誤発火を防ぐ

  constructor() {
    super(SceneKeys.Title);
  }

  create(): void {
    this.helpVisible = false;
    this.cameras.main.fadeIn(280, 0, 0, 0);

    this.buildSkyAndScenery();
    this.buildLogo();
    this.buildButtons();
    this.buildFooter();
    this.buildLegend();

    // Enter / Space で即スタート（オーバーレイが開いている時は無効）
    this.input.keyboard?.on('keydown-ENTER', () => this.maybeStart());
    this.input.keyboard?.on('keydown-SPACE', () => this.maybeStart());
  }

  // ── 背景 ───────────────────────────────────────────────
  private buildSkyAndScenery(): void {
    // 朝のグラデ空（上：薄ピンク〜オレンジ → 下：薄水色）
    const skyTop = this.add.rectangle(0, 0, GAME_WIDTH, 220, 0xffd6a8, 1).setOrigin(0, 0);
    const skyMid = this.add.rectangle(0, 220, GAME_WIDTH, 180, 0xffe7c2, 1).setOrigin(0, 0);
    const skyBot = this.add.rectangle(0, 400, GAME_WIDTH, GAME_HEIGHT - 400, 0xa8e0ff, 1).setOrigin(0, 0);
    skyTop.setDepth(Depth.BgFar);
    skyMid.setDepth(Depth.BgFar);
    skyBot.setDepth(Depth.BgFar);

    // 太陽
    const sun = this.add.circle(GAME_WIDTH - 200, 150, 56, 0xfff3a6, 0.95).setDepth(Depth.BgFar);
    this.add.circle(GAME_WIDTH - 200, 150, 80, 0xffe486, 0.35).setDepth(Depth.BgFar);
    this.tweens.add({
      targets: sun,
      scale: { from: 1, to: 1.08 },
      alpha: { from: 0.95, to: 1 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 街並みのシルエット（遠景）
    const buildings = this.add.graphics().setDepth(Depth.BgMid);
    buildings.fillStyle(0xd7a6d9, 0.55);
    for (let x = 0; x < GAME_WIDTH; x += 90) {
      const h = 80 + ((x * 13) % 80);
      buildings.fillRect(x, GAME_HEIGHT - 280 - h, 78, h + 4);
      // 窓
      buildings.fillStyle(0xffe1c8, 0.7);
      for (let wy = 0; wy < h - 16; wy += 18) {
        buildings.fillRect(x + 10, GAME_HEIGHT - 280 - h + 14 + wy, 6, 6);
        buildings.fillRect(x + 30, GAME_HEIGHT - 280 - h + 14 + wy, 6, 6);
        buildings.fillRect(x + 50, GAME_HEIGHT - 280 - h + 14 + wy, 6, 6);
      }
      buildings.fillStyle(0xd7a6d9, 0.55);
    }

    // 山影（パララックス無しの装飾）
    this.add.image(220, GAME_HEIGHT - 200, Tex.Mountain).setOrigin(0.5, 1).setAlpha(0.7).setDepth(Depth.BgMid);
    this.add
      .image(GAME_WIDTH - 280, GAME_HEIGHT - 200, Tex.Mountain)
      .setOrigin(0.5, 1)
      .setAlpha(0.6)
      .setScale(0.85, 0.8)
      .setDepth(Depth.BgMid);

    // 流れる雲
    for (let i = 0; i < 5; i++) {
      const cloud = this.add
        .image(160 + i * 280, 80 + (i % 2) * 60, Tex.Cloud)
        .setAlpha(0.95)
        .setScale(0.6 + (i % 2) * 0.25)
        .setDepth(Depth.BgMid);
      this.tweens.add({
        targets: cloud,
        x: cloud.x + 60,
        duration: 6000 + i * 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // 地面（草）
    const groundCount = Math.ceil(GAME_WIDTH / 64) + 1;
    for (let i = 0; i < groundCount; i++) {
      this.add.image(i * 64, GAME_HEIGHT, Tex.GroundTile).setOrigin(0, 1).setDepth(Depth.Ground);
    }

    // 公園の木とベンチ
    this.add.image(140, GAME_HEIGHT - 96, Tex.Tree).setOrigin(0.5, 1).setDepth(Depth.Decor);
    this.add
      .image(GAME_WIDTH - 160, GAME_HEIGHT - 96, Tex.Tree)
      .setOrigin(0.5, 1)
      .setScale(0.9)
      .setDepth(Depth.Decor);
    this.add.image(GAME_WIDTH * 0.5 + 260, GAME_HEIGHT - 96, Tex.Bench).setOrigin(0.5, 1).setDepth(Depth.Decor);
    this.add
      .image(GAME_WIDTH * 0.3, GAME_HEIGHT - 96, Tex.Bush)
      .setOrigin(0.5, 1)
      .setDepth(Depth.Decor)
      .setAlpha(0.9);
    this.add
      .image(GAME_WIDTH * 0.78, GAME_HEIGHT - 96, Tex.Bush)
      .setOrigin(0.5, 1)
      .setDepth(Depth.Decor)
      .setAlpha(0.9);

    // 走るランナー（タイトルアニメ）
    const runner = this.add
      .image(-80, GAME_HEIGHT - 96, Tex.PlayerRun)
      .setOrigin(0.5, 1)
      .setDepth(Depth.Player);
    this.tweens.add({
      targets: runner,
      x: GAME_WIDTH + 80,
      duration: 9000,
      repeat: -1,
      ease: 'Linear'
    });
    this.tweens.add({
      targets: runner,
      y: GAME_HEIGHT - 96 - 6,
      yoyo: true,
      duration: 220,
      repeat: -1
    });

    // 花（タイトルでも軽く咲かせる）
    for (let i = 0; i < 10; i++) {
      const x = 80 + i * 120 + (Math.random() - 0.5) * 30;
      this.add.image(x, GAME_HEIGHT - 100, Tex.Flower).setOrigin(0.5, 1).setDepth(Depth.Decor).setScale(0.9);
    }
  }

  // ── ロゴ ───────────────────────────────────────────────
  private buildLogo(): void {
    const cx = GAME_WIDTH / 2;

    // ロゴパネル
    const panel = this.add
      .rectangle(cx, 156, 820, 168, 0x10131c, 0.55)
      .setStrokeStyle(4, 0xffe066, 1)
      .setDepth(Depth.Hud);

    // 上部小バッジ
    this.add
      .text(cx - 360, 92, 'PLOGGING QUEST', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#10131c',
        backgroundColor: '#ffe066',
        padding: { x: 8, y: 3 },
        fontStyle: 'bold'
      })
      .setOrigin(0, 0.5)
      .setDepth(Depth.Hud + 1);

    // ロゴテキスト（ぼかし→本体の擬似グロー）
    const glow = this.add
      .text(cx + 2, 142, 'まちピカランナー', {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        color: '#fff0a0',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setAlpha(0.5)
      .setDepth(Depth.Hud);

    const logo = this.add
      .text(cx, 140, 'まちピカランナー', {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        color: '#ffe066',
        fontStyle: 'bold',
        stroke: '#3a2a00',
        strokeThickness: 6,
        shadow: { offsetX: 0, offsetY: 3, color: '#000000', blur: 6, fill: true }
      })
      .setOrigin(0.5)
      .setDepth(Depth.Hud + 1);

    // サブタイトル
    const sub = this.add
      .text(cx, 200, '〜 走って・拾って・分別して、街をピカピカに 〜', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setDepth(Depth.Hud + 1);

    // ふわふわ
    this.tweens.add({
      targets: [logo, glow, sub],
      y: '-=4',
      yoyo: true,
      repeat: -1,
      duration: 1400,
      ease: 'Sine.easeInOut'
    });

    void panel;
  }

  // ── ボタン ─────────────────────────────────────────────
  private buildButtons(): void {
    const cx = GAME_WIDTH / 2;
    const by = GAME_HEIGHT - 130;

    new Button(this, cx - 150, by, '▶ START', () => this.startGame(), {
      width: 250,
      height: 64,
      fontSize: 26,
      bg: 0xff7a3d,
      bgHover: 0xffa672
    })
      .setDepth(Depth.Hud);

    new Button(this, cx + 150, by, '？ HOW TO PLAY', () => this.toggleHelp(true), {
      width: 250,
      height: 64,
      fontSize: 20,
      bg: 0x4aa8e0,
      bgHover: 0x7cc6f1
    })
      .setDepth(Depth.Hud);

    // 「Enter でも始められるよ」の案内
    this.add
      .text(cx, by + 50, 'Enter / Space でもスタート', {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setAlpha(0.8)
      .setDepth(Depth.Hud);
  }

  // ── 凡例とハイスコア ──────────────────────────────────
  private buildLegend(): void {
    const cx = GAME_WIDTH / 2;
    const y = 300;

    // 凡例パネル
    this.add
      .rectangle(cx, y + 28, 760, 96, 0x000000, 0.35)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setDepth(Depth.Hud);

    this.add
      .text(cx, y - 12, '— 拾えるゴミと分別カテゴリ —', {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setDepth(Depth.Hud + 1);

    TRASH_KINDS.forEach((kind, i) => {
      const x = cx - ((TRASH_KINDS.length - 1) * 130) / 2 + i * 130;
      this.add.image(x, y + 16, `tex_trash_${kind}`).setDepth(Depth.Hud + 1);
      this.add
        .text(x, y + 44, TRASH_TYPES[kind].label, {
          fontFamily: 'sans-serif',
          fontSize: '12px',
          color: '#ffffff'
        })
        .setOrigin(0.5)
        .setDepth(Depth.Hud + 1);
    });

    // ハイスコア
    const hs = loadHighScore();
    if (hs) {
      this.add
        .text(cx, y + 76, `★ HIGH SCORE  ${hs.score.toLocaleString()}（${hs.rank}）`, {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#ffe066',
          fontStyle: 'bold'
        })
        .setOrigin(0.5)
        .setDepth(Depth.Hud + 1);
    }
  }

  private buildFooter(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 28, 'このゲームは完全オリジナル作品です。既存IPの利用はありません。', {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setAlpha(0.8)
      .setDepth(Depth.Hud);
  }

  // ── HOW TO PLAY オーバーレイ ──────────────────────────
  private toggleHelp(show: boolean): void {
    Sound.unlock();
    if (show) {
      if (this.helpOverlay) return;
      this.helpOverlay = this.createHelpPanel();
      this.helpVisible = true;
    } else {
      this.helpOverlay?.destroy();
      this.helpOverlay = undefined;
      this.helpVisible = false;
      this.startGuardUntil = this.time.now + 200;
    }
  }

  private createHelpPanel(): Phaser.GameObjects.Container {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const root = this.add.container(0, 0).setDepth(Depth.Overlay);

    const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x10131c, 0.75).setOrigin(0, 0);
    bg.setInteractive(); // 後ろのクリックを吸収
    root.add(bg);

    const panel = this.add
      .rectangle(cx, cy, 760, 480, 0x1c2233, 0.95)
      .setStrokeStyle(3, 0xffe066, 1);
    root.add(panel);

    root.add(
      this.add
        .text(cx, cy - 210, 'HOW TO PLAY', {
          fontFamily: 'sans-serif',
          fontSize: '28px',
          color: '#ffe066',
          fontStyle: 'bold'
        })
        .setOrigin(0.5)
    );

    const lines: Array<[string, string]> = [
      ['← / → または A / D', '左右に走る'],
      ['Space / ↑ / W', 'ジャンプ（長押しで高く跳ぶ）'],
      ['↓ / S', 'しゃがむ（自転車・カラスを避けられる）'],
      ['E（押しっぱなしOK）', '近くのゴミを拾う'],
      ['F', '近くの分別ボックスに、合うゴミだけを投入'],
      ['P', '一時停止 / 再開'],
      ['R', 'リスタート']
    ];
    lines.forEach((row, i) => {
      const y = cy - 150 + i * 32;
      root.add(
        this.add
          .text(cx - 320, y, row[0], {
            fontFamily: 'sans-serif',
            fontSize: '18px',
            color: '#ffe066',
            fontStyle: 'bold'
          })
          .setOrigin(0, 0.5)
      );
      root.add(
        this.add
          .text(cx - 40, y, row[1], {
            fontFamily: 'sans-serif',
            fontSize: '17px',
            color: '#ffffff'
          })
          .setOrigin(0, 0.5)
      );
    });

    // 遊び方Tip
    const tip = [
      'Tip 1: 同じ種類のゴミを連続で拾うとコンボ倍率が上がってスコアが伸びる。',
      'Tip 2: 分別ボックスに近づくと「F: ◯個 投入できる！」のヒントが出るよ。',
      'Tip 3: 袋が満杯になったら頭上に「FULL!」が点灯。早めに投入しよう。'
    ];
    tip.forEach((t, i) => {
      root.add(
        this.add
          .text(cx, cy + 110 + i * 22, t, {
            fontFamily: 'sans-serif',
            fontSize: '13px',
            color: '#a6e3ff'
          })
          .setOrigin(0.5)
      );
    });

    // 閉じるボタン
    const close = new Button(this, cx, cy + 200, '閉じる', () => this.toggleHelp(false), {
      width: 180,
      height: 44,
      fontSize: 18,
      bg: 0xff7a3d,
      bgHover: 0xffa672
    });
    root.add(close);

    // ESC でも閉じる
    this.input.keyboard?.once('keydown-ESC', () => this.toggleHelp(false));

    // 入場アニメ
    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 200 });

    return root;
  }

  // ── スタート ──────────────────────────────────────────
  private maybeStart(): void {
    if (this.helpVisible) return;
    if (this.time.now < this.startGuardUntil) return;
    this.startGame();
  }

  private startGame(): void {
    Sound.unlock(); // ユーザ操作なのでここで AudioContext を起こす
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.time.delayedCall(240, () => this.scene.start(SceneKeys.StageSelect));
  }
}
