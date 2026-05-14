import Phaser from 'phaser';
import { Depth, GAME_HEIGHT, GAME_WIDTH, RANK_COMMENTS, RANK_MEANINGS, type RunResult } from '../constants';
import { Button } from './Button';
import { Sound } from '../systems/SoundService';
import { hexString } from '../utils/math';
import { LEVELS } from '../data/levels';

// リザルト画面の描画。ResultScene が利用する。
export class ResultPanel extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    result: RunResult,
    onRetry: () => void,
    onTitle: () => void,
    onNext?: () => void
  ) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(Depth.Overlay);

    // 背景
    const bg = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0e1320, 0.94)
      .setOrigin(0, 0);
    this.add(bg);

    const cx = GAME_WIDTH / 2;

    // ヘッダー（終了理由によって文言を切替）
    const cleanlinessReached = result.cleanliness >= result.targetCleanliness;
    let headerText: string;
    let headerColor: string;
    let subText: string;
    if (result.cleared) {
      if (cleanlinessReached) {
        headerText = 'STAGE CLEAR';
        headerColor = '#ffe066';
        subText = `Stage ${result.levelIndex + 1} ：${result.levelName}`;
      } else {
        // ゴールはしたが目標クリーン度に届かなかった
        headerText = 'STAGE CLEAR';
        headerColor = '#ffd86b';
        subText = `ゴールしたけど、街を十分きれいにできなかった（目標 ${result.targetCleanliness}%）`;
      }
    } else if (result.endReason === 'life-zero') {
      headerText = 'GAME OVER';
      headerColor = '#ff8a8a';
      subText = 'ライフがなくなった';
    } else if (result.endReason === 'time-up') {
      headerText = 'TIME UP';
      headerColor = '#ff8a8a';
      subText = '時間切れ — ゴールまでたどり着けなかった';
    } else {
      headerText = 'GAME OVER';
      headerColor = '#ff8a8a';
      subText = 'もう一度トライ！';
    }

    const header = scene.add
      .text(cx, 60, headerText, {
        fontFamily: 'sans-serif',
        fontSize: '46px',
        color: headerColor,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(0.5);
    this.add(header);

    const subHeader = scene.add
      .text(cx, 100, subText, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        wordWrap: { width: 720 },
        align: 'center'
      })
      .setOrigin(0.5)
      .setAlpha(0.9);
    this.add(subHeader);

    // ランクサークル
    const rankColor = ResultPanel.rankColor(result.rank);
    const rankColorHex = hexString(rankColor);
    const rankCircle = scene.add
      .circle(cx, 200, 70, 0x000000, 0.35)
      .setStrokeStyle(5, rankColor, 1);
    const rankRing = scene.add
      .circle(cx, 200, 84, 0x000000, 0)
      .setStrokeStyle(2, rankColor, 0.4);
    const rankText = scene.add
      .text(cx, 200, result.rank, {
        fontFamily: 'sans-serif',
        fontSize: '80px',
        color: rankColorHex,
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    this.add(rankCircle);
    this.add(rankRing);
    this.add(rankText);

    // ランクの短い意味（S＝かなりきれい / A＝十分 / B＝もう少し / C＝見直そう）
    const meaning = scene.add
      .text(cx, 282, `Rank ${result.rank} — ${RANK_MEANINGS[result.rank]}`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: rankColorHex,
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    this.add(meaning);

    // ランクコメント（長め）
    const comment = scene.add
      .text(cx, 306, result.cleared ? RANK_COMMENTS[result.rank] : '街はまだ汚れたまま…次こそは！', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        wordWrap: { width: 720 },
        align: 'center'
      })
      .setOrigin(0.5);
    this.add(comment);

    // スコア（大きく見せる）
    const scoreLabel = scene.add
      .text(cx, 340, 'SCORE', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#a6e3ff'
      })
      .setOrigin(0.5);
    const scoreText = scene.add
      .text(cx, 372, result.score.toLocaleString(), {
        fontFamily: 'sans-serif',
        fontSize: '46px',
        color: '#ffe066',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    this.add(scoreLabel);
    this.add(scoreText);

    // 2 列のステータス
    const stats: Array<[string, string]> = [
      ['拾ったゴミ', `${result.picked} 個`],
      ['正しく分別', `${result.sortedCorrect} 個`],
      ['誤った分別', `${result.sortedWrong} 個`],
      ['最大コンボ', `x${result.maxCombo}`],
      ['クリーン度', `${Math.round(result.cleanliness)} %`],
      ['残り時間', `${result.remainingSec} 秒`]
    ];
    const colW = 280;
    const rowH = 28;
    const startY = 432;
    stats.forEach((row, i) => {
      const col = i % 2;
      const r = Math.floor(i / 2);
      const x = cx - colW + col * (colW * 2);
      const y = startY + r * rowH;
      const label = scene.add
        .text(x - 80, y, row[0], {
          fontFamily: 'sans-serif',
          fontSize: '15px',
          color: '#a6e3ff'
        })
        .setOrigin(0, 0.5);
      const value = scene.add
        .text(x + 100, y, row[1], {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#ffffff',
          fontStyle: 'bold'
        })
        .setOrigin(1, 0.5);
      this.add(label);
      this.add(value);
    });

    // アドバイス（結果に応じて1つだけ表示）
    const advice = ResultPanel.buildAdvice(result, cleanlinessReached);
    const adviceBg = scene.add
      .rectangle(cx, startY + 3 * rowH + 18, 720, 34, 0x10131c, 0.75)
      .setStrokeStyle(2, 0xffe066, 0.7);
    const adviceText = scene.add
      .text(cx, startY + 3 * rowH + 18, `💡 ${advice}`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffe066',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    this.add(adviceBg);
    this.add(adviceText);

    // ボタン（次のステージがある場合は 3 ボタン）
    const hasNext = result.cleared && onNext && result.levelIndex < LEVELS.length - 1;
    const btnY = GAME_HEIGHT - 78;
    if (hasNext) {
      const retryBtn = new Button(scene, cx - 270, btnY, 'もう一度', onRetry, {
        bg: 0x6c7886,
        bgHover: 0x8a96a3,
        width: 200,
        height: 54,
        fontSize: 20
      });
      const nextBtn = new Button(scene, cx, btnY, '次のステージへ ▶', onNext, {
        bg: 0xff7a3d,
        bgHover: 0xffa672,
        width: 260,
        height: 54,
        fontSize: 22
      });
      const titleBtn = new Button(scene, cx + 270, btnY, 'タイトルへ', onTitle, {
        bg: 0x4aa8e0,
        bgHover: 0x7cc6f1,
        width: 200,
        height: 54,
        fontSize: 20
      });
      this.add(retryBtn);
      this.add(nextBtn);
      this.add(titleBtn);
    } else {
      const retryBtn = new Button(scene, cx - 150, btnY, 'もう一度', onRetry, {
        bg: 0xff7a3d,
        bgHover: 0xffa672,
        width: 240,
        height: 54,
        fontSize: 22
      });
      const titleBtn = new Button(scene, cx + 150, btnY, 'タイトルへ', onTitle, {
        bg: 0x4aa8e0,
        bgHover: 0x7cc6f1,
        width: 240,
        height: 54,
        fontSize: 22
      });
      this.add(retryBtn);
      this.add(titleBtn);
    }

    // 入場アニメ
    this.setAlpha(0);
    scene.tweens.add({ targets: this, alpha: 1, duration: 400 });
    scene.tweens.add({
      targets: rankText,
      scale: { from: 0.3, to: 1 },
      duration: 520,
      ease: 'Back.easeOut',
      delay: 220
    });
    scene.tweens.add({
      targets: rankRing,
      scale: { from: 0.8, to: 1.05 },
      yoyo: true,
      repeat: -1,
      duration: 1200,
      ease: 'Sine.easeInOut'
    });

    // S/A ランクなら紙吹雪と SE
    if (result.cleared && (result.rank === 'S' || result.rank === 'A')) {
      scene.time.delayedCall(280, () => this.spawnConfetti(scene));
      scene.time.delayedCall(280, () => Sound.play('goal'));
    }
  }

  private spawnConfetti(scene: Phaser.Scene): void {
    const colors = [0xff7a3d, 0xffe066, 0x66c674, 0x4aa8e0, 0xff7eb6, 0xa6e3ff];
    const cx = GAME_WIDTH / 2;
    for (let i = 0; i < 60; i++) {
      const x = cx + (Math.random() - 0.5) * GAME_WIDTH * 0.9;
      const y = -10 + Math.random() * 30;
      const c = colors[i % colors.length];
      const rect = scene.add
        .rectangle(x, y, 8 + Math.random() * 6, 4 + Math.random() * 4, c, 1)
        .setDepth(Depth.Overlay + 1)
        .setAngle(Math.random() * 360);
      this.add(rect);
      scene.tweens.add({
        targets: rect,
        y: GAME_HEIGHT + 40,
        x: x + (Math.random() - 0.5) * 100,
        angle: rect.angle + (Math.random() < 0.5 ? -1 : 1) * 360,
        duration: 1600 + Math.random() * 900,
        ease: 'Cubic.easeIn',
        onComplete: () => rect.destroy()
      });
    }
  }

  // 1行のアドバイスを優先度順に選ぶ。最も「次に効きそう」な助言を 1 つだけ出す。
  private static buildAdvice(result: RunResult, cleanlinessReached: boolean): string {
    // 1. ライフ切れで終わった → 障害物対策が最優先
    if (result.endReason === 'life-zero' || result.hits >= 3) {
      return '障害物は早めにジャンプで避けよう（自転車・カラスはしゃがみも有効）';
    }
    // 2. 時間切れ → 効率を意識
    if (result.endReason === 'time-up') {
      return 'ゴミに寄り道しすぎず、ゴールまでの流れを意識しよう';
    }
    // 3. 誤った分別が目立つ → 分別ルールを意識
    if (result.sortedWrong >= 2 && result.sortedWrong * 2 >= result.sortedCorrect) {
      return '袋の中身を確認して、合うビンだけに投入しよう';
    }
    // 4. クリーン度未達 → 取り逃がしを減らす
    if (!cleanlinessReached) {
      return 'ゴミを取り逃がすとクリーン度が下がるよ。寄って自動取得を狙おう';
    }
    // 5. 分別回数が少ない → ためすぎ
    if (result.picked >= 8 && result.sortedCorrect < Math.floor(result.picked / 3)) {
      return '袋がいっぱいになる前に、こまめに分別しよう';
    }
    // 6. ハイコンボ達成 → 称賛＋分別との両立を勧める
    if (result.maxCombo >= 7) {
      return '連続ピックアップが上手い！次は同じ種類のままビン投入で大量得点を狙おう';
    }
    // 7. クリア時のデフォルト助言
    return 'コンボとクリーン度の両立が S ランクの近道！';
  }

  private static rankColor(rank: 'S' | 'A' | 'B' | 'C'): number {
    switch (rank) {
      case 'S':
        return 0xffd86b;
      case 'A':
        return 0x80e0a8;
      case 'B':
        return 0x7cc6f1;
      case 'C':
      default:
        return 0xc0c0c0;
    }
  }
}
