// 20 秒のゲームデモを自動プレイで録画する一回限りのスクリプト。
// Playwright + headless Chromium。出力は demo-output/demo.webm。

import { chromium } from 'playwright';
import { mkdirSync, existsSync, renameSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = './demo-output';
const TARGET_URL = process.env.DEMO_URL || 'https://machi-pika-runner.vercel.app/';
const W = 1280;
const H = 720;

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  // 前回ファイルをクリーンアップ
  for (const f of readdirSync(OUT_DIR)) {
    try { unlinkSync(join(OUT_DIR, f)); } catch {}
  }

  console.log('▶ launching headless Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT_DIR, size: { width: W, height: H } }
  });
  const page = await context.newPage();

  console.log(`▶ navigating: ${TARGET_URL}`);
  await page.goto(TARGET_URL, { waitUntil: 'load', timeout: 30000 });
  // BootScene fadeOut + TitleScene fadeIn を待つ
  await page.waitForTimeout(2400);

  // Title → StageSelect（Enter で進む）
  console.log('▶ Title → StageSelect');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);

  // Stage 1 の PLAY ボタンをクリック
  // 計算: cardWidth=270, gap=18, 4枚並ぶ → 全幅 1134, 開始 (1280-1134)/2=73, 1枚目中心=73+135=208
  // cardY = GAME_HEIGHT/2 + 20 = 380, btnY = cardY + 360/2 - 38 = 522
  console.log('▶ click PLAY (Stage 1)');
  await page.mouse.click(208, 522);
  await page.waitForTimeout(700);

  // ミッションカードを 2 秒見せて、その後スキップ → ゲームへ
  console.log('▶ mission card display');
  await page.waitForTimeout(2000);
  await page.keyboard.press('ArrowRight'); // スキップ用の任意入力
  await page.waitForTimeout(200);

  console.log('▶ auto-play (12s)');
  await page.keyboard.down('ArrowRight'); // 右移動を継続

  const start = Date.now();
  const playMs = 12000;
  let lastJumpAt = 0;
  let lastSortAt = 0;
  while (Date.now() - start < playMs) {
    // 1.4〜2.4 秒ごとに自然なジャンプ
    if (Date.now() - lastJumpAt > 1400 + Math.random() * 1000) {
      await page.keyboard.press('Space');
      lastJumpAt = Date.now();
    }
    // 3〜5 秒ごとに分別ボタン（近くにビンがあれば成功演出）
    if (Date.now() - lastSortAt > 3000 + Math.random() * 2000) {
      await page.keyboard.press('F');
      lastSortAt = Date.now();
    }
    await page.waitForTimeout(90);
  }
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(400);

  console.log('▶ closing context to flush video');
  await context.close();
  await browser.close();

  // 自動生成された .webm を demo.webm にリネーム
  const files = readdirSync(OUT_DIR);
  const webm = files.find((f) => f.endsWith('.webm'));
  if (!webm) {
    console.error('✗ no webm output');
    process.exit(1);
  }
  const finalPath = join(OUT_DIR, 'demo.webm');
  renameSync(join(OUT_DIR, webm), finalPath);
  const sz = statSync(finalPath).size;
  console.log(`\n✅ saved: ${finalPath}  (${(sz / 1024).toFixed(1)} KB)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
