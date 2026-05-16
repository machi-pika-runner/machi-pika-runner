# まちピカランナー：Plogging Quest

**ジャンル：横スクロール × プロギング（ジョギング × ゴミ拾い）アクションゲーム**
ブラウザで遊べる、完全オリジナルのアクションゲームです。

> プレイヤーは朝の街を走りながら、落ちているゴミを拾い、障害物を避け、
> 分別ボックスに正しく投入して街のクリーン度を上げ、ゴールを目指します。

## ハイライト

- **4 ステージ構成**：朝の公園 / 川沿い / 駅前商店街 / 海辺。各ステージは時間・目標クリーン度・テーマ・障害物パターンが異なる
- **マリオ風の操作**：左右 + A=JUMP / B=分別 の最小限。**ゴミは近くを通るだけで自動取得**
- モダンプラットフォーマー的なジャンプ：コヨーテタイム・ジャンプバッファ・可変高ジャンプ
- コンボ倍率（最大 x2.5）/ 分別ボックスは「合うゴミだけ」投入
- **3層 BGM**：クリーン度に応じてメロディとハーモニーが追加される
- **4層パララックス**：山影 → 山影 → 樹木シルエット → 雲
- HUD：スコア・倍率バッジ・クリーン度バー・時間・袋・コンボ・ライフ・ミュートトグル
- スマホ向け仮想ボタン（タッチデバイス自動検出 / ◀ ▶ A B の 4 ボタン）
- 色覚多様性配慮：ゴミに頭文字バッジ、ビンに略号と受入記号を併記

---

## ゲームの目的（はじめての方へ）

**ゴミを拾って、正しく分別し、クリーン度を上げてゴールを目指す**ゲームです。

### 何をすればいい？
1. 右に走ってゴール旗まで到達する
2. 落ちているゴミに近づく → **自動で拾える**
3. 分別ボックスに近づく → **B / F / Z / X** で「合うゴミだけ」投入
4. 障害物（水たまり・コーン・自転車・カラス・立看板）は避ける
5. 制限時間内にゴールしてクリア

### 良い行動 / 悪い行動

| 良い行動 | 効果 |
|---|---|
| ゴミを拾う | スコア +90〜 / クリーン度UP |
| 同じ種類で連続取得 | コンボ倍率 UP（最大 x2.5） |
| 正しく分別 | +220〜 の高得点 |
| ゴミを取り逃がさない | クリーン度を維持 |

| 注意すべき行動 | 影響 |
|---|---|
| 障害物に当たる | ライフ -1（クリーン度も減） |
| ゴミを取り逃がす（画面外に流れる） | クリーン度 - |
| 違う種類のゴミを拾う | コンボが切れる（COMBO BREAK） |
| 袋がいっぱい | 分別するまで拾えない |
| 時間切れ / ライフ0 | ゲームオーバー |

### クリア／失敗の条件

- **STAGE CLEAR**：ゴール旗まで到達
- **STAGE CLEAR（クリーン度未達）**：ゴールはしたが目標クリーン度に届かず、街は十分にきれいにならなかった
- **GAME OVER**：ライフが 0 になった
- **TIME UP**：時間切れでゴールに到達できなかった

### S/A/B/Cランクの意味（目標クリーン度を基準に判定）

| ランク | 意味 |
|---|---|
| **S** | かなりきれいにできた（目標 +15% 以上） |
| **A** | 十分クリア（目標達成） |
| **B** | もう少し拾える（目標 -15% 以内） |
| **C** | 分別と回避を見直そう |

### ステージ別の攻略ポイント

| ステージ | テーマ | 制限 | 目標 | 攻略ポイント |
|---|---|---|---|---|
| 1. 朝の公園コース | 公園 | 120秒 | 60% | 基本ルールを覚えるステージ。ゴミ拾いと分別の練習 |
| 2. 川沿いランニングコース | 川辺 | 140秒 | 65% | 水たまりは滑る。ジャンプで回避。ビニール袋は風で揺れる |
| 3. 駅前・商店街コース | 街 | 130秒 | 70% | 自転車・立看板を避けろ。袋がいっぱいになる前に早めに分別 |
| 4. 海辺クリーンアップ | 海辺 | 150秒 | 75% | 風で動くゴミを追いかける。取り逃がしを減らしてクリーン度を死守 |

---

## 著作権について（重要）

本作は **完全オリジナル作品** です。
キャラクター・名称・音楽・効果音・ステージ・敵キャラ・アイテム・ロゴ・UIなど、
**既存IPの利用・模倣は一切ありません。**
スプライトはすべて Phaser の `Graphics` API による動的生成、音声は WebAudio の自前合成で作っており、
外部素材（画像・音声）は同梱していません。

---

## 起動方法

### 必要環境
- Node.js 18 以上
- npm 9 以上
- モダンブラウザ（Chrome / Edge / Firefox / Safari）

### セットアップと実行

```bash
npm install     # 依存パッケージ
npm run dev     # 開発サーバ（http://localhost:5173）
npm run build   # 本番ビルド（dist/）
npm run preview # ビルド成果物のプレビュー
npm run lint    # ESLint
npm run test    # vitest（31 テスト）
npm run format  # Prettier
```

---

## デプロイ（Vercel）

Vercel と GitHub を連携してあり、`main` ブランチに push すれば自動で
ビルド → デプロイされます。PR を作ると自動で Preview Deployment（独立 URL）も生成されます。

公開 URL：
`https://machi-pika-runner.vercel.app/`

Vercel 側の設定（既に構成済み）：
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

`vercel.json` で再現性のため上記をコミット済みです。

---

## 操作方法

### キーボード（PC）

| キー | 動作 |
|---|---|
| ← / A | 左へ移動 |
| → / D | 右へ移動 |
| Space / ↑ / W | ジャンプ（長押しで高く・離して上昇カット） |
| ↓ / S | しゃがむ（自転車・カラスを回避） |
| **B ボタン / F / Z / X** | 分別ボックスへ投入（アクション） |
| **E** | 手動でゴミを拾う（普段は近接で自動取得） |
| P | 一時停止 / 再開 |
| R | リスタート |

タイトル画面では Enter / Space でも開始できます。

### スマートフォン（タッチ）

タッチデバイスを検出すると、画面下に自動で半透明の仮想ボタンが現れます。
- 左下：◀ ▶（移動）
- 右下：**A = JUMP / B = 分別** の 2 ボタン
- ゴミ拾いは近づくだけで自動取得

---

## ゲームフロー

1. **タイトル画面** → START（または Enter / Space）
2. **HOW TO PLAY** ボタンで操作・ルールを確認可能（タブ切替）
3. **ステージセレクト** → ステージカードで攻略ポイントと目標を確認 → PLAY
4. **ミッションカード**（2.5 秒、入力でスキップ可能）でステージ概要を表示
5. **プレイ** → ゴール到達 or 時間切れ or ライフ 0
6. **リザルト画面** → ランク・スコア・統計・改善アドバイス・もう一度／次のステージ

---

## 技術スタック

- [Vite 5](https://vitejs.dev/) … 開発サーバ／ビルダ
- TypeScript 5 strict（`noUnusedLocals` `noUnusedParameters` 含む）
- [Phaser 3](https://phaser.io/) … 2D ゲームエンジン（Arcade Physics）
- ESLint + @typescript-eslint
- Prettier
- vitest + jsdom（31 テスト：ScoreManager / CleanlinessManager / ComboManager / レベルデータ / math）

スプライトは `Phaser.Graphics` の実行時生成、音声は WebAudio の自前合成。
PNG/SVG 素材へ差し替えるには `src/game/utils/assetFactory.ts` の各
`generateXxx` 関数を `scene.load.image()` 等に置き換えるだけで OK。

---

## ディレクトリ構成（要点）

```
src/
├ main.ts                       … エントリ（?debug=1 で診断有効化）
└ game/
   ├ config.ts / constants.ts
   ├ scenes/                    … BootScene / TitleScene / StageSelectScene / GameScene / ResultScene
   ├ entities/                  … Player / TrashItem / Obstacle / SortingBin
   ├ systems/                   … Input / Score / Cleanliness / Combo / Level / Collision / Sound (+BGM)
   ├ data/                      … levels(4ステージ) / trashTypes / obstacleTypes
   ├ ui/                        … HUD / Button / ResultPanel / TouchControls
   └ utils/                     … assetFactory / math / storage / debugDiagnostics
```

---

## デバッグ・診断機能

フリーズなどの不具合を切り分けるための診断ハーネスを同梱しています。
**本番挙動は変えません**（`?debug=1` が無ければ全て No-op）。

### `?debug=1` を URL に付けて起動

```
http://localhost:5173/?debug=1
https://machi-pika-runner.vercel.app/?debug=1
```

起動すると Console に以下が出ます：
```
[MACHI_DEBUG] enabled (noScaleTween=false)
[MACHI_DEBUG] window.__MACHI_DEBUG__ available. Try .dump() / ...
```

### `window.__MACHI_DEBUG__` API

| API | 動作 |
|---|---|
| `dump()` | scene / player / input / 直近 30 フレーム / イベント履歴を console.warn |
| `lastFrames(n=30)` | 直近 n フレームの snapshot 配列 |
| `lastEvents(n=20)` | 直近 n イベント（blur / visibilitychange / forceResume 等） |
| `getCurrentSnapshot()` | 最新 1 フレーム |
| `forceResume()` | `physics.world.isPaused=false` + `scene.resume()`（フリーズ解除試行） |
| `resetInput()` | 仮想ボタン全クリア + `keyboard.resetKeys()` |
| `game / scene / player` | 各オブジェクトへの参照 |

### フリーズ watchdog（6 条件、2 秒クールダウン）

- **A**: left/right=true なのに 500ms 以上 player.x が変化しない
- **B**: input true なのに calcVx=0
- **C**: calcVx≠0 なのに body.velocity.x=0
- **D**: body.velocity.x≠0 なのに player.x が変化しない
- **E**: paused=false かつ isOver=false なのに physics.world.isPaused=true
- **F**: body.enable=false または body.moves=false

検知時のみ `console.warn` で「条件 / 現在 snapshot / 直近 30 フレーム / 直近 20 イベント」が出力されます。

### `?noScaleTween=1`

```
?debug=1&noScaleTween=1
```

ジャンプ・着地の squash scale tween を完全無効化。
「scale tween がフリーズの原因か？」を A/B 切り分けるための分離フラグです。

### debug=1 時だけ追加される安全防御

- `window.blur` / `document.visibilitychange (hidden)` / `Phaser.Scenes.Events.RESUME` で
  `InputManager.resetAll()` を実行（スタックキー対策）

---

## ゲーム内アクション・フィードバック早見表

| イベント | 表示 |
|---|---|
| ゴミを拾う | `+90`（黄色） |
| コンボ達成 | `GOOD! / NICE! / FIRE! / BURNING!` ＋倍率バッジ |
| 正しく分別 | `★ NICE SORT ×N` `+gain`（緑） |
| 違うビン | トースト「ここでは投入できないよ…」 |
| コンボ切れ | `COMBO BREAK`（薄赤） |
| 障害物ヒット | `ライフ -1`（赤）＋画面シェイク |
| 水たまり | `SLIP`（青） |
| 袋満杯 | 頭上に `FULL!` ＋トースト「袋がいっぱい！…」 |
| 袋容量UP | トースト「袋が大きくなった！ +2」 |
| ゴール | バナー `STAGE CLEAR!` ＋紙吹雪 |

---

## 開発メモ

- TypeScript は `strict: true`。`noUnusedLocals` / `noUnusedParameters` も有効
- Phaser の `Sprite` は `input` プロパティを既に持つため、Player クラスでは入力管理を `inputMgr` フィールド名で保持
- 障害物のうち `bicycle` / `crow` は **しゃがみ中なら回避可能**
- 分別ボックスは「合うゴミだけ投入、残りは袋に残す」仕様
- BGM は WebAudio 自前合成。クリーン度 50% でメロディ、75% でハーモニーがフェードイン

---

楽しんでもらえたら嬉しいです。
