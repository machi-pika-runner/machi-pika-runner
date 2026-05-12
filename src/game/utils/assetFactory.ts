// Phaser.Graphics で全スプライトを動的生成する。
// 後から PNG/SVG 素材に差し替える場合は、各 generateXxx 関数の代わりに
// scene.load.image() を呼ぶように切り替えれば良い。

import Phaser from 'phaser';
import { Tex } from '../constants';
import { TRASH_TYPES, type TrashKind } from '../data/trashTypes';
import { OBSTACLE_DEFS, type ObstacleKind } from '../data/obstacleTypes';

const tmpKey = '__tmp_gfx__';

// Graphics → Texture 化のヘルパ
const bake = (
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (g: Phaser.GameObjects.Graphics) => void
): void => {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics({ x: 0, y: 0 });
  g.setVisible(false);
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
};

// 1px の白テクスチャ。スケールしてバーやフェード矩形に使う。
const generatePixel = (scene: Phaser.Scene): void => {
  bake(scene, Tex.Pixel, 2, 2, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
  });
};

const generatePlayer = (scene: Phaser.Scene): void => {
  // 統一サイズで描いておくと、後で差し替えしやすい
  const W = 56;
  const H = 84;

  // 共通: ランナー素体（頭・体・腕・脚）
  const drawBase = (g: Phaser.GameObjects.Graphics, frame: 'idle' | 'run' | 'jump' | 'duck' | 'hurt') => {
    const skin = 0xfdd9b5;
    const shirt = 0xff7a3d; // 明るいオレンジ
    const shirtAccent = 0xffd86b;
    const pants = 0x355c7d;
    const shoe = 0x2a3a4a;
    const hairBand = 0x66c674;

    if (frame === 'duck') {
      // しゃがみ姿勢
      // 体
      g.fillStyle(shirt, 1);
      g.fillRoundedRect(8, 38, 40, 28, 6);
      // 顔
      g.fillStyle(skin, 1);
      g.fillCircle(28, 30, 14);
      // ヘアバンド
      g.fillStyle(hairBand, 1);
      g.fillRect(15, 18, 26, 4);
      // 目
      g.fillStyle(0x222222, 1);
      g.fillCircle(33, 30, 1.6);
      // 脚（折り畳み）
      g.fillStyle(pants, 1);
      g.fillRoundedRect(10, 60, 36, 18, 4);
      // 靴
      g.fillStyle(shoe, 1);
      g.fillRoundedRect(8, 76, 18, 6, 2);
      g.fillRoundedRect(30, 76, 18, 6, 2);
      // アクセント
      g.fillStyle(shirtAccent, 1);
      g.fillRect(10, 50, 36, 3);
      return;
    }

    // 頭
    g.fillStyle(skin, 1);
    g.fillCircle(30, 22, 14);
    // ヘアバンド
    g.fillStyle(hairBand, 1);
    g.fillRect(17, 10, 26, 4);
    // 目（右向き）
    g.fillStyle(0x222222, 1);
    g.fillCircle(35, 22, 1.8);
    // チーク
    g.fillStyle(0xff8a8a, 0.7);
    g.fillCircle(38, 27, 2.2);

    // 体
    g.fillStyle(shirt, 1);
    g.fillRoundedRect(14, 34, 32, 28, 6);
    g.fillStyle(shirtAccent, 1);
    g.fillRect(14, 46, 32, 3);

    // 腕／脚はフレームで分岐
    if (frame === 'idle') {
      // 腕
      g.fillStyle(skin, 1);
      g.fillRoundedRect(8, 38, 8, 22, 3);
      g.fillRoundedRect(44, 38, 8, 22, 3);
      // 脚
      g.fillStyle(pants, 1);
      g.fillRoundedRect(16, 60, 12, 20, 3);
      g.fillRoundedRect(32, 60, 12, 20, 3);
      g.fillStyle(shoe, 1);
      g.fillRoundedRect(14, 78, 16, 6, 2);
      g.fillRoundedRect(30, 78, 16, 6, 2);
    } else if (frame === 'run') {
      // 腕（前後にスイング）
      g.fillStyle(skin, 1);
      g.fillRoundedRect(2, 36, 9, 22, 3);
      g.fillRoundedRect(48, 38, 9, 22, 3);
      // 脚（前後）
      g.fillStyle(pants, 1);
      g.fillRoundedRect(8, 58, 14, 22, 3);
      g.fillRoundedRect(34, 58, 14, 22, 3);
      g.fillStyle(shoe, 1);
      g.fillRoundedRect(4, 78, 18, 6, 2);
      g.fillRoundedRect(34, 78, 20, 6, 2);
    } else if (frame === 'jump') {
      // ジャンプ（腕上、脚すぼめ）
      g.fillStyle(skin, 1);
      g.fillRoundedRect(6, 22, 9, 24, 3);
      g.fillRoundedRect(46, 22, 9, 24, 3);
      g.fillStyle(pants, 1);
      g.fillRoundedRect(14, 58, 14, 18, 3);
      g.fillRoundedRect(30, 58, 14, 18, 3);
      g.fillStyle(shoe, 1);
      g.fillRoundedRect(12, 74, 18, 6, 2);
      g.fillRoundedRect(30, 74, 18, 6, 2);
    } else if (frame === 'hurt') {
      // のけぞり風
      g.fillStyle(skin, 1);
      g.fillRoundedRect(2, 32, 8, 22, 3);
      g.fillRoundedRect(48, 32, 8, 22, 3);
      g.fillStyle(pants, 1);
      g.fillRoundedRect(16, 60, 12, 18, 3);
      g.fillRoundedRect(32, 60, 12, 18, 3);
      g.fillStyle(shoe, 1);
      g.fillRoundedRect(14, 76, 16, 6, 2);
      g.fillRoundedRect(30, 76, 16, 6, 2);
    }
  };

  bake(scene, Tex.PlayerIdle, W, H, (g) => drawBase(g, 'idle'));
  bake(scene, Tex.PlayerRun, W, H, (g) => drawBase(g, 'run'));
  bake(scene, Tex.PlayerJump, W, H, (g) => drawBase(g, 'jump'));
  bake(scene, Tex.PlayerDuck, W, H, (g) => drawBase(g, 'duck'));
  bake(scene, Tex.PlayerHurt, W, H, (g) => drawBase(g, 'hurt'));
};

const generateGround = (scene: Phaser.Scene): void => {
  // 地面タイル（水平に並べる）
  bake(scene, Tex.GroundTile, 64, 96, (g) => {
    // 上面：草
    g.fillStyle(0x6cc06b, 1);
    g.fillRect(0, 0, 64, 16);
    // 草ハイライト
    g.fillStyle(0x8ed889, 1);
    for (let i = 0; i < 6; i++) g.fillRect(i * 11, 0, 4, 4);
    // 土
    g.fillStyle(0xb78b5a, 1);
    g.fillRect(0, 16, 64, 80);
    // 土の粒
    g.fillStyle(0x8a6034, 1);
    g.fillCircle(10, 30, 2);
    g.fillCircle(40, 50, 2);
    g.fillCircle(22, 70, 1.5);
    g.fillCircle(52, 84, 2);
    // 影
    g.fillStyle(0x000000, 0.08);
    g.fillRect(0, 92, 64, 4);
  });

  // 地面装飾（小石・フチ）
  bake(scene, Tex.GroundDecor, 64, 16, (g) => {
    g.fillStyle(0x4ea448, 1);
    g.fillRect(0, 0, 64, 4);
    g.fillStyle(0x222222, 0.06);
    g.fillRect(0, 4, 64, 1);
  });
};

const generateTree = (scene: Phaser.Scene): void => {
  bake(scene, Tex.Tree, 120, 180, (g) => {
    // 幹
    g.fillStyle(0x8a5a2b, 1);
    g.fillRoundedRect(54, 110, 14, 70, 3);
    // 葉（3 段）
    g.fillStyle(0x4caf50, 1);
    g.fillCircle(60, 60, 50);
    g.fillStyle(0x66bb6a, 1);
    g.fillCircle(40, 80, 36);
    g.fillCircle(82, 80, 36);
    // ハイライト
    g.fillStyle(0x9ed59f, 0.8);
    g.fillCircle(50, 45, 14);
  });
};

const generateBush = (scene: Phaser.Scene): void => {
  bake(scene, Tex.Bush, 120, 60, (g) => {
    g.fillStyle(0x4caf50, 1);
    g.fillCircle(20, 40, 22);
    g.fillCircle(60, 30, 28);
    g.fillCircle(100, 40, 22);
    g.fillStyle(0x80c884, 0.9);
    g.fillCircle(60, 22, 12);
  });
};

const generateBench = (scene: Phaser.Scene): void => {
  bake(scene, Tex.Bench, 120, 60, (g) => {
    // 脚
    g.fillStyle(0x4a4a4a, 1);
    g.fillRect(12, 22, 8, 36);
    g.fillRect(100, 22, 8, 36);
    // 座面
    g.fillStyle(0xb47a3d, 1);
    g.fillRoundedRect(4, 18, 112, 12, 3);
    // 背もたれの板（薄め）
    g.fillStyle(0xc4854b, 1);
    g.fillRoundedRect(4, 6, 112, 8, 2);
    // ハイライト
    g.fillStyle(0xffffff, 0.15);
    g.fillRect(6, 20, 108, 2);
  });
};

const generateCloud = (scene: Phaser.Scene): void => {
  bake(scene, Tex.Cloud, 180, 70, (g) => {
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(40, 40, 28);
    g.fillCircle(80, 30, 32);
    g.fillCircle(120, 38, 28);
    g.fillCircle(150, 44, 22);
  });
};

const generateMountain = (scene: Phaser.Scene): void => {
  bake(scene, Tex.Mountain, 360, 200, (g) => {
    g.fillStyle(0x84a4c0, 1);
    g.fillTriangle(0, 200, 180, 30, 360, 200);
    g.fillStyle(0xa9c0d8, 1);
    g.fillTriangle(140, 200, 240, 90, 320, 200);
    // 雪
    g.fillStyle(0xffffff, 0.9);
    g.fillTriangle(160, 60, 180, 30, 200, 60);
    g.fillTriangle(170, 65, 200, 70, 192, 50);
  });
};

const generateBird = (scene: Phaser.Scene): void => {
  // 遠景の小鳥（M字シルエット）
  bake(scene, Tex.Bird, 30, 14, (g) => {
    g.lineStyle(2, 0x333333, 1);
    g.beginPath();
    g.moveTo(0, 8);
    g.lineTo(8, 0);
    g.lineTo(15, 6);
    g.lineTo(22, 0);
    g.lineTo(30, 8);
    g.strokePath();
  });
};

const generateFlower = (scene: Phaser.Scene): void => {
  bake(scene, Tex.Flower, 18, 18, (g) => {
    g.fillStyle(0xffe066, 1);
    g.fillCircle(9, 9, 3);
    g.fillStyle(0xff7eb6, 1);
    g.fillCircle(9, 3, 3);
    g.fillCircle(15, 9, 3);
    g.fillCircle(9, 15, 3);
    g.fillCircle(3, 9, 3);
  });
};

const generateGoal = (scene: Phaser.Scene): void => {
  // ゴール: 旗+ポール
  bake(scene, Tex.Goal, 80, 200, (g) => {
    g.fillStyle(0xeeeeee, 1);
    g.fillRect(36, 0, 6, 200);
    g.fillStyle(0xff4b6e, 1);
    g.fillTriangle(42, 4, 78, 22, 42, 40);
    g.fillStyle(0xffd86b, 1);
    g.fillCircle(60, 22, 4);
  });
};

const generateBin = (scene: Phaser.Scene): void => {
  // 単色テクスチャ。色はスプライト側で着色する。
  bake(scene, Tex.Bin, 96, 96, (g) => {
    // 本体（白）
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(8, 24, 80, 68, 6);
    // フタ
    g.fillStyle(0xeeeeee, 1);
    g.fillRoundedRect(4, 16, 88, 14, 4);
    // 投入口
    g.fillStyle(0x222222, 1);
    g.fillRoundedRect(28, 22, 40, 4, 2);
    // 縦リブ
    g.fillStyle(0x000000, 0.08);
    g.fillRect(28, 32, 2, 56);
    g.fillRect(50, 32, 2, 56);
    g.fillRect(72, 32, 2, 56);
    // 影
    g.fillStyle(0x000000, 0.18);
    g.fillRect(8, 90, 80, 4);
  });
};

const generateTrash = (scene: Phaser.Scene): void => {
  // それぞれ 36x36 で生成
  const draw = (kind: TrashKind, g: Phaser.GameObjects.Graphics) => {
    const def = TRASH_TYPES[kind];
    switch (kind) {
      case 'paper': {
        // クシャクシャの紙
        g.fillStyle(def.color, 1);
        g.fillCircle(18, 20, 13);
        g.fillStyle(def.outline, 1);
        g.lineStyle(1.5, def.outline, 1);
        g.beginPath();
        g.moveTo(8, 16);
        g.lineTo(14, 22);
        g.moveTo(20, 12);
        g.lineTo(24, 18);
        g.moveTo(12, 24);
        g.lineTo(20, 28);
        g.strokePath();
        break;
      }
      case 'bottle': {
        // ペットボトル
        g.fillStyle(def.color, 1);
        g.fillRoundedRect(11, 6, 14, 26, 4);
        g.fillStyle(0xffffff, 0.6);
        g.fillRect(13, 8, 3, 22);
        g.fillStyle(0x4aa8e0, 1);
        g.fillRect(13, 18, 10, 4);
        g.fillStyle(def.outline, 1);
        g.fillRect(15, 2, 6, 5);
        break;
      }
      case 'can': {
        // 空き缶
        g.fillStyle(def.color, 1);
        g.fillRoundedRect(10, 8, 16, 22, 3);
        g.fillStyle(def.outline, 1);
        g.fillRect(10, 14, 16, 3);
        g.fillStyle(0xffffff, 0.5);
        g.fillRect(12, 10, 2, 18);
        break;
      }
      case 'plastic': {
        // ビニール袋
        g.fillStyle(def.color, 0.85);
        g.fillRoundedRect(6, 10, 24, 20, 6);
        g.fillStyle(def.outline, 1);
        g.fillRect(13, 6, 4, 6);
        g.fillRect(19, 6, 4, 6);
        g.fillStyle(0xffffff, 0.4);
        g.fillRect(10, 14, 4, 10);
        break;
      }
      case 'food': {
        // 食品ごみ容器
        g.fillStyle(def.color, 1);
        g.fillRoundedRect(6, 14, 24, 16, 4);
        g.fillStyle(def.outline, 1);
        g.fillRect(6, 12, 24, 3);
        g.fillStyle(0xeeb47a, 1);
        g.fillCircle(14, 22, 3);
        g.fillCircle(22, 22, 3);
        break;
      }
    }
  };

  (Object.keys(TRASH_TYPES) as TrashKind[]).forEach((kind) => {
    const key = `tex_trash_${kind}`;
    bake(scene, key, 36, 36, (g) => draw(kind, g));
  });
};

// 形状＋テキスト記号でも識別できるようにする小バッジを生成。
// 色覚多様性配慮：色だけに依存しない。
const generateTrashBadges = (scene: Phaser.Scene): void => {
  const map: Record<TrashKind, string> = {
    paper: 'P',
    bottle: 'B',
    can: 'C',
    plastic: 'V',
    food: 'F'
  };
  (Object.keys(map) as TrashKind[]).forEach((kind) => {
    const key = `tex_trash_badge_${kind}`;
    if (scene.textures.exists(key)) return;
    const txt = scene.add
      .text(0, 0, map[kind], {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#10131c',
        backgroundColor: '#ffffff',
        padding: { x: 4, y: 1 },
        fontStyle: 'bold'
      })
      .setVisible(false);
    // Phaser の Text は generateTexture を直接持たないため、
    // 一度描画した RT 経由でテクスチャ化する
    const rt = scene.add.renderTexture(0, 0, txt.width, txt.height).setVisible(false);
    rt.draw(txt, 0, 0);
    rt.saveTexture(key);
    txt.destroy();
    rt.destroy();
  });
};

const generateObstacles = (scene: Phaser.Scene): void => {
  const draw = (kind: ObstacleKind, g: Phaser.GameObjects.Graphics, w: number, h: number) => {
    switch (kind) {
      case 'puddle': {
        g.fillStyle(0x6db4d6, 0.85);
        g.fillEllipse(w / 2, h - 6, w - 4, h);
        g.fillStyle(0xffffff, 0.5);
        g.fillEllipse(w / 2 - 12, h - 10, 16, 4);
        break;
      }
      case 'cone': {
        // カラーコーン
        g.fillStyle(0xff7e3d, 1);
        g.fillTriangle(w / 2, 2, 4, h - 6, w - 4, h - 6);
        g.fillStyle(0xffffff, 1);
        g.fillRect(8, h - 22, w - 16, 5);
        g.fillStyle(0x444444, 1);
        g.fillRect(2, h - 6, w - 4, 6);
        break;
      }
      case 'bicycle': {
        // 自転車（横向き）
        g.fillStyle(0x222222, 1);
        g.fillCircle(14, h - 10, 12);
        g.fillCircle(w - 14, h - 10, 12);
        g.fillStyle(0xeeeeee, 1);
        g.fillCircle(14, h - 10, 4);
        g.fillCircle(w - 14, h - 10, 4);
        g.lineStyle(4, 0x4a90e2, 1);
        g.beginPath();
        g.moveTo(14, h - 10);
        g.lineTo(w / 2, h - 28);
        g.lineTo(w - 14, h - 10);
        g.moveTo(w / 2, h - 28);
        g.lineTo(w / 2 + 12, 6);
        g.strokePath();
        // サドル
        g.fillStyle(0x222222, 1);
        g.fillRect(w / 2 - 8, h - 36, 14, 4);
        // ハンドル
        g.fillRect(w / 2 + 6, 4, 14, 4);
        break;
      }
      case 'crow': {
        // カラス（飛行中）
        g.fillStyle(0x222222, 1);
        g.fillEllipse(w / 2, h / 2, w * 0.55, h * 0.55);
        g.fillTriangle(w / 2 - 4, h / 2 - 2, 4, 2, 12, h / 2);
        g.fillTriangle(w / 2 + 4, h / 2 - 2, w - 4, 2, w - 12, h / 2);
        g.fillStyle(0xffd54a, 1);
        g.fillTriangle(w - 6, h / 2, w + 4, h / 2 + 2, w - 6, h / 2 + 4);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(w - 10, h / 2 - 2, 1.5);
        break;
      }
      case 'signboard': {
        // 立看板（A 字型）
        g.fillStyle(0x000000, 0.12);
        g.fillEllipse(w / 2, h - 2, w - 6, 6);
        g.fillStyle(0x6c4a2a, 1);
        g.fillRect(12, h - 22, 4, 20);
        g.fillRect(w - 16, h - 22, 4, 20);
        g.fillStyle(0xe04a4a, 1);
        g.fillRoundedRect(4, 8, w - 8, h - 22, 4);
        g.fillStyle(0xffffff, 1);
        g.fillRect(8, 22, w - 16, 4);
        g.fillRect(8, 34, w - 16, 4);
        g.fillStyle(0xffffff, 0.3);
        g.fillRect(6, 10, 4, h - 30);
        break;
      }
    }
  };

  (Object.keys(OBSTACLE_DEFS) as ObstacleKind[]).forEach((kind) => {
    const def = OBSTACLE_DEFS[kind];
    const key = `tex_obs_${kind}`;
    bake(scene, key, def.width, def.height, (g) => draw(kind, g, def.width, def.height));
  });
};

// ──────── テーマ別テクスチャ ────────
const generateThemeTextures = (scene: Phaser.Scene): void => {
  // 砂浜地面
  bake(scene, Tex.SandTile, 64, 96, (g) => {
    g.fillStyle(0xf4e1a4, 1);
    g.fillRect(0, 0, 64, 24);
    g.fillStyle(0xe7cf86, 1);
    g.fillRect(0, 24, 64, 72);
    // 砂の粒
    g.fillStyle(0xb89a5a, 1);
    for (let i = 0; i < 12; i++) {
      g.fillCircle(((i * 17) % 60) + 4, 30 + (i * 11) % 60, 1.2);
    }
    // 影
    g.fillStyle(0x000000, 0.06);
    g.fillRect(0, 92, 64, 4);
  });

  // アスファルト地面
  bake(scene, Tex.AsphaltTile, 64, 96, (g) => {
    g.fillStyle(0xd6d3cb, 1);
    g.fillRect(0, 0, 64, 6); // 縁石
    g.fillStyle(0x4a4a52, 1);
    g.fillRect(0, 6, 64, 90);
    // 白線
    g.fillStyle(0xeeeeee, 0.7);
    g.fillRect(8, 38, 16, 4);
    g.fillRect(40, 38, 16, 4);
    // ヒビ
    g.fillStyle(0x2a2a30, 1);
    g.fillRect(20, 60, 24, 1);
    g.fillRect(12, 76, 8, 1);
  });

  // ヤシの木
  bake(scene, Tex.PalmTree, 100, 180, (g) => {
    g.fillStyle(0x8a5a2b, 1);
    g.fillRoundedRect(46, 80, 12, 100, 3);
    // 葉
    g.fillStyle(0x4caf50, 1);
    g.fillTriangle(50, 60, 10, 30, 16, 90);
    g.fillTriangle(52, 60, 90, 30, 84, 90);
    g.fillTriangle(50, 50, 30, 0, 60, 70);
    g.fillTriangle(52, 50, 80, 0, 50, 70);
    g.fillStyle(0xa3d3a8, 0.85);
    g.fillTriangle(52, 56, 60, 28, 70, 60);
    // ココナッツ
    g.fillStyle(0x5a3413, 1);
    g.fillCircle(46, 76, 4);
    g.fillCircle(58, 76, 4);
  });

  // 街のビル（タイトル背景のと違って前景用）
  bake(scene, Tex.Building, 100, 240, (g) => {
    g.fillStyle(0x7a7e8c, 1);
    g.fillRect(0, 20, 100, 220);
    // 屋上
    g.fillStyle(0x5a5e6c, 1);
    g.fillRect(0, 16, 100, 6);
    // 窓
    g.fillStyle(0xffd86b, 0.85);
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 4; col++) {
        const lit = (row * 4 + col) % 3 !== 0;
        g.fillStyle(lit ? 0xffe9a8 : 0x2a2a30, 0.85);
        g.fillRect(10 + col * 22, 32 + row * 20, 14, 12);
      }
    }
  });

  // 波（海岸の水面）
  bake(scene, Tex.WaveStrip, 200, 40, (g) => {
    g.fillStyle(0x4aa8e0, 1);
    g.fillRect(0, 14, 200, 26);
    // 白波
    g.fillStyle(0xffffff, 0.7);
    for (let x = 0; x < 200; x += 24) {
      g.fillEllipse(x + 12, 14, 22, 6);
    }
    // 細波
    g.fillStyle(0xffffff, 0.35);
    g.fillRect(0, 24, 200, 1);
    g.fillRect(0, 32, 200, 1);
  });
};

export const generateAllTextures = (scene: Phaser.Scene): void => {
  // 重複生成を避けるため、存在チェックは bake() 側で行う
  generatePixel(scene);
  generatePlayer(scene);
  generateGround(scene);
  generateTree(scene);
  generateBush(scene);
  generateBench(scene);
  generateCloud(scene);
  generateMountain(scene);
  generateBird(scene);
  generateFlower(scene);
  generateGoal(scene);
  generateBin(scene);
  generateTrash(scene);
  generateTrashBadges(scene);
  generateObstacles(scene);
  generateThemeTextures(scene);

  // tmpKey を確実にクリーンアップ
  if (scene.textures.exists(tmpKey)) scene.textures.remove(tmpKey);
};
