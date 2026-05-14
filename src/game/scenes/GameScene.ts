import Phaser from 'phaser';
import {
  BAG_CAPACITY_PER_UPGRADE,
  BAG_INITIAL_CAPACITY,
  BAG_UPGRADE_THRESHOLD,
  CLEANLINESS_HIT_PENALTY,
  CLEANLINESS_MISS_PENALTY,
  CLEANLINESS_PICK_GAIN,
  CLEANLINESS_SORT_BONUS,
  CLEANLINESS_WRONG_SORT_PENALTY,
  Depth,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  PICKUP_FLAVOR,
  PLAYER_AUTO_PICKUP_COOLDOWN_MS,
  PLAYER_PICKUP_RANGE,
  SCORE_CLEANLINESS_BONUS_PER_PCT,
  SCORE_TIME_BONUS_PER_SEC,
  SceneKeys,
  THEME_COLORS,
  Tex,
  getComboTier,
  type Rank,
  type RunResult
} from '../constants';
import { Sound } from '../systems/SoundService';
import { hexString, lerpColor, pick } from '../utils/math';
import { getLevel } from '../data/levels';
import {
  CATEGORIES,
  TRASH_TYPES,
  type TrashCategory,
  type TrashKind
} from '../data/trashTypes';
import { Player } from '../entities/Player';
import { TrashItem } from '../entities/TrashItem';
import { Obstacle } from '../entities/Obstacle';
import { SortingBin } from '../entities/SortingBin';
import { CleanlinessManager } from '../systems/CleanlinessManager';
import { CollisionManager } from '../systems/CollisionManager';
import { ComboManager } from '../systems/ComboManager';
import { InputManager } from '../systems/InputManager';
import { LevelManager } from '../systems/LevelManager';
import { ScoreManager } from '../systems/ScoreManager';
import { HUD } from '../ui/HUD';
import { TouchControls } from '../ui/TouchControls';
import { clamp } from '../utils/math';

export class GameScene extends Phaser.Scene {
  private input2!: InputManager;
  private player!: Player;
  private hud!: HUD;
  private score!: ScoreManager;
  private cleanliness!: CleanlinessManager;
  private combo!: ComboManager;

  private groundGroup!: Phaser.Physics.Arcade.StaticGroup;
  private trashGroup!: Phaser.Physics.Arcade.Group;
  private obstacleGroup!: Phaser.Physics.Arcade.Group;
  private binGroup!: Phaser.Physics.Arcade.StaticGroup;
  private bins: SortingBin[] = [];
  private obstacles: Obstacle[] = [];
  private goalX = 0;
  private goalSprite!: Phaser.GameObjects.Image;

  private held: TrashKind[] = [];
  private capacity = BAG_INITIAL_CAPACITY;
  private nextAutoPickupAt = 0; // E 長押しオート取得のクールダウン

  private timeLeft = 120;
  private elapsed = 0;
  private isOver = false;
  private resultSent = false;
  private paused = false;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private cleanlinessLayer?: Phaser.GameObjects.Container;
  private flowerLayer?: Phaser.GameObjects.Container;

  // 演出用
  private cloudLayer?: Phaser.GameObjects.Container;
  private birdLayer?: Phaser.GameObjects.Container;
  private sparkleLayer?: Phaser.GameObjects.Container;
  private skyTopRect?: Phaser.GameObjects.Rectangle;
  private hitObstacles = new WeakSet<Obstacle>();
  private _actionWasDown = false; // タッチ action ボタンのエッジ検出用

  // クリーン度で空色を補間（テーマで色帯が変わる）
  private bgDirty = 0x8c9eaf;
  private bgClean = 0xa8e0ff;
  private skyTopDirty = 0xc9a787;
  private skyTopClean = 0xffd6a8;

  private levelIndex = 0;
  private level = getLevel(0);

  constructor() {
    super(SceneKeys.Game);
  }

  init(data: { levelIndex?: number }): void {
    this.levelIndex = data?.levelIndex ?? 0;
    this.level = getLevel(this.levelIndex);
    const c = THEME_COLORS[this.level.theme];
    this.bgDirty = c.bgDirty;
    this.bgClean = c.bgClean;
    this.skyTopDirty = c.skyDirty;
    this.skyTopClean = c.skyClean;
  }

  create(): void {
    // 状態の完全リセット（前回 run の残骸がフリーズを起こさないよう全フィールドを初期化）
    this.isOver = false;
    this.resultSent = false;
    this.paused = false;
    this.held = [];
    this.capacity = BAG_INITIAL_CAPACITY;
    this.timeLeft = this.level.timeLimit;
    this.elapsed = 0;
    this.bins = [];
    this.obstacles = [];
    this.goalX = 0;
    this.nextAutoPickupAt = 0;
    this._actionWasDown = false;
    this.hitObstacles = new WeakSet<Obstacle>();

    // 物理ワールドの一時停止解除（前回ポーズ状態が残らないように）
    this.physics.world.isPaused = false;

    this.physics.world.setBounds(0, 0, this.level.width, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, this.level.width, GAME_HEIGHT);
    this.cameras.main.setBackgroundColor('#a8e0ff');

    // 防御：シーンが外部要因で pause された場合は即 resume（タブ復帰・モーダル復帰で詰まらない）
    this.events.on(Phaser.Scenes.Events.PAUSE, () => {
      if (!this.paused) this.scene.resume();
    });

    // 背景・装飾
    this.buildBackground();
    this.buildDecor();

    // 地面
    this.groundGroup = this.physics.add.staticGroup();
    this.buildGround();

    // グループ
    this.trashGroup = this.physics.add.group();
    this.obstacleGroup = this.physics.add.group();
    this.binGroup = this.physics.add.staticGroup();

    // プレイヤー
    this.player = new Player(this, this.level.spawnX, GROUND_Y);
    this.input2 = new InputManager(this);
    this.player.bindInput(this.input2);

    // システム
    this.score = new ScoreManager();
    this.cleanliness = new CleanlinessManager();
    this.combo = new ComboManager();

    // レベル配置
    const lm = new LevelManager();
    const wind = this.level.wind ?? 0;
    lm.build(this.level, {
      onTrash: (x, y, kind) => {
        const t = new TrashItem(this, x, y, kind);
        if (wind) t.applyWind(wind);
        this.trashGroup.add(t);
      },
      onObstacle: (x, y, kind) => {
        const o = new Obstacle(this, x, y, kind);
        this.obstacleGroup.add(o);
        this.obstacles.push(o);
      },
      onBin: (x, category) => {
        const b = new SortingBin(this, x, category);
        this.binGroup.add(b);
        this.bins.push(b);
      },
      onGoal: (x) => {
        this.goalX = x;
        this.goalSprite = this.add
          .image(x, GROUND_Y, Tex.Goal)
          .setOrigin(0.5, 1)
          .setDepth(Depth.Decor);
        // ゴール周辺の装飾
        this.add.image(x - 90, GROUND_Y, Tex.Bush).setOrigin(0.5, 1).setDepth(Depth.Decor);
        this.add.image(x + 80, GROUND_Y, Tex.Bush).setOrigin(0.5, 1).setDepth(Depth.Decor);
      }
    });

    // 衝突
    const cm = new CollisionManager(this);
    cm.setup(
      {
        player: this.player,
        ground: this.groundGroup,
        trashes: this.trashGroup,
        obstacles: this.obstacleGroup,
        bins: this.binGroup
      },
      {
        // 自動拾いはせず、近接表示のみ。E キーで拾う。
        onTrashOverlap: () => {
          /* no-op (use distance-based pickup on E key) */
        },
        onObstacleOverlap: (_p, obj) => this.handleObstacleHit(obj as Obstacle),
        onBinOverlap: () => {
          /* prompt は update で制御 */
        }
      }
    );

    // カメラ
    this.cameras.main.startFollow(this.player, true, 0.12, 0.1);
    this.cameras.main.setDeadzone(140, 200);
    this.cameras.main.setFollowOffset(-80, 0);

    // HUD
    this.hud = new HUD(this);
    this.hud.setScore(0);
    this.hud.setCleanliness(this.cleanliness.value);
    this.hud.setTime(this.timeLeft);
    this.hud.setBag(0, this.capacity);
    this.hud.setLife(this.player.life);
    this.hud.setCombo(0);
    this.hud.setHeld(null, 0);

    this.score.on('change', (v: number) => this.hud.setScore(v));
    this.cleanliness.on('change', (v: number) => {
      this.hud.setCleanliness(v);
      this.applyCleanlinessVisuals(v);
    });
    this.combo.on('change', (c: number) => this.hud.setCombo(c));

    // タイマー（1秒毎）
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.paused || this.isOver) return;
        this.timeLeft = Math.max(0, this.timeLeft - 1);
        this.hud.setTime(this.timeLeft);
        if (this.timeLeft === 0) this.endGame(false);
      }
    });

    this.applyCleanlinessVisuals(this.cleanliness.value);

    // タッチデバイスなら仮想ボタンを表示
    new TouchControls(this, this.input2);

    // 開始トースト
    this.hud.toast(`Stage ${this.levelIndex + 1} : ${this.level.name}`, '#ffe066', 1600);

    // BGM 開始（シーン終了時に自動停止）
    Sound.startBgm();
    this.events.once('shutdown', () => Sound.stopBgm());

    // クリーン度変化 → BGM レイヤ更新
    this.cleanliness.on('change', (v: number) => Sound.setBgmCleanliness(v));
  }

  // ---------------- 背景 ----------------

  private buildBackground(): void {
    // 上空に薄い色帯を敷いて、クリーン度で色を補間する
    this.skyTopRect = this.add
      .rectangle(0, 0, GAME_WIDTH, 240, this.skyTopDirty, 0.8)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(Depth.BgFar);

    // 遠景レイヤ 1：もう一段奥（暗めの山影、強パララックス）
    this.add
      .tileSprite(0, GAME_HEIGHT - 70, GAME_WIDTH, 200, Tex.Mountain)
      .setOrigin(0, 1)
      .setScrollFactor(0.04)
      .setDepth(Depth.BgFar)
      .setAlpha(0.32)
      .setTint(0x6a7a98);

    // 遠景レイヤ 2：山影（中程度パララックス）
    this.add
      .tileSprite(0, GAME_HEIGHT - 96, GAME_WIDTH, 200, Tex.Mountain)
      .setOrigin(0, 1)
      .setScrollFactor(0.1)
      .setDepth(Depth.BgFar)
      .setAlpha(0.55);

    // 遠景レイヤ 3：樹木シルエット帯（4層目）
    this.add
      .tileSprite(0, GAME_HEIGHT - 96, GAME_WIDTH, 80, Tex.TreeLine)
      .setOrigin(0, 1)
      .setScrollFactor(0.2)
      .setDepth(Depth.BgMid)
      .setAlpha(0.72)
      .setTint(this.treeLineTint());

    // 中景: 雲
    this.cloudLayer = this.add.container(0, 0).setDepth(Depth.BgMid);
    for (let i = 0; i < 14; i++) {
      const c = this.add
        .image(i * 360 + 100, 60 + (i % 3) * 50, Tex.Cloud)
        .setAlpha(0.85 - (i % 3) * 0.1)
        .setScale(0.6 + (i % 3) * 0.25);
      c.setScrollFactor(0.3);
      this.cloudLayer.add(c);
    }

    // キラキラ（クリーン度高いとき出る）
    this.sparkleLayer = this.add.container(0, 0).setDepth(Depth.BgNear);
  }

  private buildDecor(): void {
    const w = this.level.width;
    const theme = this.level.theme;

    // テーマごとの並木／背景物体
    if (theme === 'park' || theme === 'river') {
      for (let x = 200; x < w - 200; x += 380) {
        const sx = x + Math.random() * 60;
        const tree = this.add.image(sx, GROUND_Y, Tex.Tree).setOrigin(0.5, 1).setDepth(Depth.Decor);
        tree.setScale(0.85 + Math.random() * 0.25);
      }
      for (let x = 600; x < w - 200; x += 720) {
        this.add.image(x, GROUND_Y, Tex.Bench).setOrigin(0.5, 1).setDepth(Depth.Decor);
      }
      for (let x = 120; x < w - 120; x += 240) {
        this.add
          .image(x + Math.random() * 60, GROUND_Y, Tex.Bush)
          .setOrigin(0.5, 1)
          .setDepth(Depth.Decor)
          .setAlpha(0.85);
      }
    } else if (theme === 'town') {
      // ビル群（パララックス）
      for (let x = 120; x < w; x += 220) {
        const b = this.add
          .image(x, GROUND_Y - 96, Tex.Building)
          .setOrigin(0.5, 1)
          .setDepth(Depth.BgMid)
          .setScale(0.7 + Math.random() * 0.4, 0.9 + Math.random() * 0.3);
        b.setScrollFactor(0.6);
      }
      // コーンや道路装飾は障害物に任せる。歩道のフチ。
      for (let x = 0; x < w; x += 64) {
        this.add
          .rectangle(x, GROUND_Y - 96, 64, 4, 0xffffff, 0.4)
          .setOrigin(0, 0)
          .setDepth(Depth.Decor);
      }
    } else if (theme === 'beach') {
      // ヤシの木と波
      for (let x = 200; x < w - 200; x += 460) {
        const sx = x + Math.random() * 80;
        this.add
          .image(sx, GROUND_Y, Tex.PalmTree)
          .setOrigin(0.5, 1)
          .setDepth(Depth.Decor)
          .setScale(0.85 + Math.random() * 0.3);
      }
      // 海（背景近く）
      for (let x = 0; x < w; x += 200) {
        const wave = this.add
          .image(x, GROUND_Y - 100, Tex.WaveStrip)
          .setOrigin(0, 1)
          .setDepth(Depth.BgMid)
          .setAlpha(0.8);
        wave.setScrollFactor(0.5);
        this.tweens.add({
          targets: wave,
          alpha: { from: 0.6, to: 0.9 },
          yoyo: true,
          repeat: -1,
          duration: 1400 + Math.random() * 800
        });
      }
    }

    // 「綺麗」演出用の花レイヤ（最初は非表示）
    this.flowerLayer = this.add.container(0, 0).setDepth(Depth.Decor);
    for (let x = 200; x < this.level.width - 200; x += 90) {
      const f = this.add
        .image(x + Math.random() * 60, GROUND_Y - 4, Tex.Flower)
        .setOrigin(0.5, 1)
        .setAlpha(0)
        .setScale(0.8 + Math.random() * 0.6);
      this.flowerLayer.add(f);
    }

    // 鳥の演出レイヤ
    this.birdLayer = this.add.container(0, 0).setDepth(Depth.BgNear);

    // 「汚れ」レイヤ（クリーン度低い時に上掛け）
    this.cleanlinessLayer = this.add.container(0, 0).setDepth(Depth.BgNear);
    const haze = this.add
      .rectangle(0, 0, this.level.width, GAME_HEIGHT, 0x6b6b3d, 0.18)
      .setOrigin(0, 0);
    this.cleanlinessLayer.add(haze);
  }

  private buildGround(): void {
    const tileW = 64;
    const count = Math.ceil(this.level.width / tileW) + 2;
    const groundTex = this.groundTextureForTheme();
    for (let i = 0; i < count; i++) {
      const x = i * tileW;
      const tile = this.add.image(x, GAME_HEIGHT, groundTex).setOrigin(0, 1);
      tile.setDepth(Depth.Ground);
    }
    // 1 本の長いコライダ（軽量化）
    const collider = this.add
      .rectangle(this.level.width / 2, GAME_HEIGHT - 48, this.level.width, 96, 0x000000, 0)
      .setOrigin(0.5, 0.5);
    this.physics.add.existing(collider, true);
    this.groundGroup.add(collider);
  }

  private groundTextureForTheme(): string {
    switch (this.level.theme) {
      case 'town':
        return Tex.AsphaltTile;
      case 'beach':
        return Tex.SandTile;
      case 'park':
      case 'river':
      default:
        return Tex.GroundTile;
    }
  }

  private treeLineTint(): number {
    switch (this.level.theme) {
      case 'town':  return 0x3a3a48; // 灰みがかったビル風シルエット
      case 'beach': return 0x2a3820; // やや明るい熱帯樹木
      default:      return 0x1a2e18; // 公園・川：濃い緑の森
    }
  }

  // ---------------- update ----------------

  update(_time: number, delta: number): void {
    if (this.isOver) return;
    this.elapsed += delta;

    // ポーズトグル
    if (this.input2.justPressed('pause')) this.togglePause();
    // リスタート
    if (this.input2.justPressed('restart')) this.scene.restart();

    if (this.paused) return;

    // プレイヤー
    this.player.tick();

    // 障害物動き
    for (const o of this.obstacles) o.tick(delta);

    // ゴール判定（通過時にゴール演出を出してから endGame）
    if (this.player.x >= this.goalX) {
      this.triggerGoalCelebration();
      return;
    }

    // ゴール演出（旗を揺らす）
    if (this.goalSprite) {
      const angle = Math.sin(this.elapsed * 0.004) * 3;
      this.goalSprite.setAngle(angle);
    }

    // ゴミ取り逃しペナルティ：プレイヤーが大きく通り過ぎたゴミは除去（クリーン度減）
    this.trashGroup.getChildren().forEach((c) => {
      const t = c as TrashItem;
      if (!t.active || t.picked) return;
      if (t.x < this.player.x - 220) {
        // 取り逃し（軽いがチリツモで効くペナルティ）
        this.cleanliness.add(-CLEANLINESS_MISS_PENALTY);
        t.picked = true;
        this.tweens.add({
          targets: t,
          alpha: 0,
          duration: 200,
          onComplete: () => t.destroy()
        });
      }
    });

    // ── 自動近接ピックアップ（マリオのコイン自動取得と同様）──
    if (this.elapsed >= this.nextAutoPickupAt) {
      if (this.tryPickup(true)) this.nextAutoPickupAt = this.elapsed + PLAYER_AUTO_PICKUP_COOLDOWN_MS;
    }
    // E キー：手動拾い（念のため残す）
    if (this.input2.justPressed('pickup')) this.tryPickup(false);

    // B ボタン（touch）または Z/X/F キー：分別（アクション）
    // virtual ボタンは isDown でエッジ検出
    const actionDown = this.input2.isDown('action') || this.input2.isDown('sort');
    const actionJustFired =
      this.input2.justPressed('sort') ||
      this.input2.justPressed('action') ||
      (actionDown && !this._actionWasDown);
    this._actionWasDown = actionDown;
    if (actionJustFired) this.trySort();

    // 分別ボックスのプロンプト（一致数を表示）
    for (const b of this.bins) {
      const d = Math.abs(b.x - this.player.x);
      const near = d < 110;
      const matching = near
        ? this.held.reduce(
            (acc, k) => (TRASH_TYPES[k].category === b.category ? acc + 1 : acc),
            0
          )
        : 0;
      b.setReady(near, matching, this.held.length > 0);
    }

    // 雲をゆっくり流す
    if (this.cloudLayer) {
      this.cloudLayer.iterate((c: Phaser.GameObjects.GameObject) => {
        const img = c as Phaser.GameObjects.Image;
        img.x -= 0.15;
        if (img.x < this.cameras.main.scrollX - 200) img.x += GAME_WIDTH + 400;
      });
    }
  }

  // ---------------- 行動ハンドラ ----------------

  // 拾いに成功したら true。autoMode=true は近接自動ピックアップ（短射程）。
  private tryPickup(autoMode = false): boolean {
    if (this.held.length >= this.capacity) {
      if (!autoMode) this.hud.toast('袋がいっぱい！分別ボックスに入れて！', '#ffd86b');
      return false;
    }
    const center = this.player.getPickupCenter();
    let nearest: TrashItem | null = null;
    // 自動は近距離のみ。手動はフル射程。
    let nearestD = autoMode ? 50 : PLAYER_PICKUP_RANGE;
    this.trashGroup.getChildren().forEach((c) => {
      const t = c as TrashItem;
      if (!t.active || t.picked) return;
      const d = Phaser.Math.Distance.Between(center.x, center.y, t.x, t.y - 16);
      if (d < nearestD) {
        nearest = t;
        nearestD = d;
      }
    });
    if (!nearest) return false;

    const trash = nearest as TrashItem;
    trash.pickUp();

    // ステート更新
    this.held.push(trash.kind);
    const comboCount = this.combo.registerPick(trash.kind);
    const gained = this.score.addPick(comboCount);
    this.cleanliness.add(CLEANLINESS_PICK_GAIN);
    this.refreshBagUI();
    Sound.play(comboCount >= 3 ? 'pickupCombo' : 'pickup');

    // 容量アップグレード
    if (
      this.score.picked >= BAG_UPGRADE_THRESHOLD &&
      (this.score.picked - 1) % BAG_UPGRADE_THRESHOLD === BAG_UPGRADE_THRESHOLD - 1
    ) {
      this.capacity += BAG_CAPACITY_PER_UPGRADE;
      this.refreshBagUI();
      this.hud.toast(`袋が大きくなった！ +${BAG_CAPACITY_PER_UPGRADE}`, '#a6e3ff', 1200);
      Sound.play('bagUpgrade');
    }

    // 取得演出（スコア＋ティアラベル＋たまにフレーバー）
    this.spawnFloatText(this.player.x, this.player.y - 80, `+${gained}`, '#ffe066');
    this.spawnSparkle(trash.x, trash.y - 18);
    const tier = getComboTier(comboCount);
    if (tier.label) {
      this.spawnComboLabel(this.player.x, this.player.y - 110, tier.label, tier.color, comboCount);
    } else if (Math.random() < 0.35) {
      // 1〜2 連の時はたまにフレーバーで気持ちよさを足す
      this.spawnFloatText(this.player.x + 24, this.player.y - 60, pick(PICKUP_FLAVOR), '#a6ffb6');
    }
    return true;
  }

  private spawnComboLabel(x: number, y: number, label: string, color: string, combo: number): void {
    const text = this.add
      .text(x, y, `${label}  x${combo}`, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color,
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(Depth.Particle)
      .setScale(0.4);
    this.tweens.add({
      targets: text,
      scale: { from: 0.4, to: 1.1 },
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: text,
          y: y - 36,
          alpha: 0,
          duration: 600,
          ease: 'Cubic.easeOut',
          onComplete: () => text.destroy()
        });
      }
    });
  }

  private refreshBagUI(): void {
    this.hud.setBag(this.held.length, this.capacity);
    this.hud.setHeld(this.held[this.held.length - 1] ?? null, this.held.length);
    this.player.setBagFull(this.held.length >= this.capacity);
  }

  private trySort(): void {
    if (this.held.length === 0) return;
    // 最寄りのビン
    let nearest: SortingBin | null = null;
    let nearestD = 110;
    for (const b of this.bins) {
      const d = Math.abs(b.x - this.player.x);
      if (d < nearestD) {
        nearest = b;
        nearestD = d;
      }
    }
    if (!nearest) {
      this.hud.toast('近くに分別ボックスがないよ', '#ff8a8a', 800);
      return;
    }
    const bin = nearest as SortingBin;

    // 一致するゴミだけを取り出して投入する。
    const matched: TrashKind[] = [];
    const remained: TrashKind[] = [];
    for (const kind of this.held) {
      if (TRASH_TYPES[kind].category === bin.category) matched.push(kind);
      else remained.push(kind);
    }

    if (matched.length === 0) {
      // 一致なし＝間違いビン。小ペナルティだけ与えて袋は維持
      this.score.addSortWrong();
      this.cleanliness.add(-CLEANLINESS_WRONG_SORT_PENALTY);
      bin.flash(0xff7e3d);
      Sound.play('sortBad');
      this.hud.toast('ここでは投入できないよ…', '#ff8a8a', 900);
      this.spawnFloatText(bin.x, bin.y - 110, 'NG', '#ff8a8a');
      return;
    }

    // 投入成功（件数分の加点）
    let totalGain = 0;
    for (let i = 0; i < matched.length; i++) {
      totalGain += this.score.addSortCorrect(this.combo.count);
    }
    this.cleanliness.add(CLEANLINESS_SORT_BONUS * matched.length);
    bin.flash(0xffd86b);
    Sound.play('sortGood');

    // 残ったゴミはそのまま袋へ戻す
    this.held = remained;
    this.refreshBagUI();

    this.hud.toast(
      remained.length > 0
        ? `${matched.length}個 投入！ +${totalGain}（残り${remained.length}）`
        : `Perfect! ${matched.length}個 投入！ +${totalGain}`,
      '#a6ffb6',
      950
    );
    this.spawnFloatText(bin.x, bin.y - 130, `+${totalGain}`, '#a6ffb6');
    this.spawnComboLabel(bin.x, bin.y - 160, '★ NICE SORT', '#a6ffb6', matched.length);

    // 投入演出: ゴミがビンに吸い込まれる軌跡＋紙吹雪
    this.spawnSortFlyEffect(bin.x, bin.y - 60, matched);
    this.cameras.main.flash(140, 255, 255, 220);
  }

  // 投入時にゴミアイコンが舞い上がってビンに吸い込まれる軌跡を出す
  private spawnSortFlyEffect(targetX: number, targetY: number, kinds: TrashKind[]): void {
    kinds.forEach((kind, idx) => {
      const startX = this.player.x + (Math.random() - 0.5) * 30;
      const startY = this.player.y - 60;
      const icon = this.add
        .image(startX, startY, `tex_trash_${kind}`)
        .setDepth(Depth.Particle)
        .setScale(0.9);
      this.tweens.add({
        targets: icon,
        x: targetX,
        y: targetY,
        scale: 0.3,
        alpha: 0.2,
        angle: 180 + Math.random() * 180,
        duration: 380 + idx * 50,
        ease: 'Cubic.easeIn',
        onComplete: () => icon.destroy()
      });
    });
  }

  private handleObstacleHit(obs: Obstacle): void {
    if (this.player.isInvincible) return;
    if (obs.isSlippery) {
      // ぬれて滑る
      if (!this.hitObstacles.has(obs)) {
        this.hitObstacles.add(obs);
        this.player.applySlip();
        this.hud.toast('つるん…！ 足が滑った', '#a6e3ff', 700);
        this.spawnFloatText(this.player.x, this.player.y - 80, 'SLIP', '#a6e3ff');
        this.time.delayedCall(700, () => {
          this.hitObstacles.delete(obs);
        });
      }
      return;
    }

    // しゃがみで自転車・カラスは回避（高さで判定する近似）
    if ((obs.kind === 'bicycle' || obs.kind === 'crow') && this.player.isCrouching) {
      return;
    }

    if (obs.damage > 0) {
      const alive = this.player.takeDamage();
      this.cleanliness.add(-CLEANLINESS_HIT_PENALTY);
      this.combo.reset();
      this.hud.setLife(this.player.life);
      this.cameras.main.shake(180, 0.005);
      this.spawnFloatText(this.player.x, this.player.y - 80, 'OUCH!', '#ff8080');
      if (!alive) this.endGame(false);
    }
  }

  // ---------------- 演出 ----------------

  private spawnFloatText(x: number, y: number, msg: string, color: string): void {
    const t = this.add
      .text(x, y, msg, {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(Depth.Particle);
    this.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy()
    });
  }

  private spawnSparkle(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const star = this.add
        .image(x, y, Tex.Pixel)
        .setTint(0xffe066)
        .setScale(2)
        .setDepth(Depth.Particle);
      const ang = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 18;
      this.tweens.add({
        targets: star,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        alpha: 0,
        duration: 420,
        onComplete: () => star.destroy()
      });
    }
  }

  private applyCleanlinessVisuals(v: number): void {
    const t = clamp(v / 100, 0, 1);

    // 背景の濁り（クリーン度が低いほど濃い）
    const haze = this.cleanlinessLayer?.list[0] as Phaser.GameObjects.Rectangle | undefined;
    if (haze) {
      const a = clamp((1 - t) * 0.35, 0, 0.35);
      haze.setFillStyle(0x6b6b3d, a);
    }

    // 空の色をクリーン度に応じて補間（カメラ背景 + 上空の薄帯）
    const bgColor = lerpColor(this.bgDirty, this.bgClean, t);
    this.cameras.main.setBackgroundColor(hexString(bgColor));
    if (this.skyTopRect) {
      const topColor = lerpColor(this.skyTopDirty, this.skyTopClean, t);
      this.skyTopRect.setFillStyle(topColor, 0.85);
    }

    // 花は段階的に咲く
    if (this.flowerLayer) {
      const target = v >= 80 ? 1 : v >= 50 ? 0.55 : v >= 30 ? 0.2 : 0;
      this.flowerLayer.iterate((g: Phaser.GameObjects.GameObject) => {
        const img = g as Phaser.GameObjects.Image;
        img.setAlpha(target * (0.6 + (Math.sin(img.x * 0.01) + 1) * 0.2));
      });
    }

    // 80% 以上で鳥が飛ぶ
    if (v >= 80 && this.birdLayer && this.birdLayer.length === 0) {
      for (let i = 0; i < 4; i++) {
        const b = this.add
          .image(this.cameras.main.scrollX - 80, 80 + i * 40, Tex.Bird)
          .setScale(1)
          .setAlpha(0.9);
        this.birdLayer.add(b);
        this.tweens.add({
          targets: b,
          x: this.cameras.main.scrollX + GAME_WIDTH + 200,
          y: '+=20',
          duration: 7000 + i * 1500,
          onComplete: () => b.destroy()
        });
      }
    }

    // 80% 以上で空中にキラキラが時々出る
    if (v >= 80 && this.sparkleLayer && this.sparkleLayer.length < 6) {
      const sx = this.cameras.main.scrollX + Math.random() * GAME_WIDTH;
      const sy = 80 + Math.random() * 200;
      const star = this.add
        .image(sx, sy, Tex.Pixel)
        .setTint(0xfff5b3)
        .setScale(3)
        .setAlpha(0)
        .setDepth(Depth.BgNear);
      this.sparkleLayer.add(star);
      this.tweens.add({
        targets: star,
        alpha: { from: 0, to: 1 },
        scale: { from: 1, to: 4 },
        duration: 500,
        yoyo: true,
        onComplete: () => star.destroy()
      });
    }
  }

  // ---------------- ポーズ ----------------

  private togglePause(): void {
    this.paused = !this.paused;
    this.physics.world.isPaused = this.paused;
    if (this.paused) {
      this.pauseOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(Depth.Overlay);
      const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0, 0);
      const t = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, 'PAUSE', {
          fontFamily: 'sans-serif',
          fontSize: '64px',
          color: '#ffffff',
          fontStyle: 'bold'
        })
        .setOrigin(0.5);
      const sub = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, 'P で再開 / R でリスタート', {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          color: '#ffffff'
        })
        .setOrigin(0.5);
      this.pauseOverlay.add([bg, t, sub]);
    } else {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = undefined;
    }
  }

  // ゴール演出：紙吹雪・カメラズーム・SE → 1 拍置いてリザルト
  private triggerGoalCelebration(): void {
    if (this.isOver) return;
    this.isOver = true;
    Sound.play('goal');

    // プレイヤーをジャンプ＆停止
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
    body.setVelocityY(-360);

    // 「STAGE CLEAR!」テキスト（画面固定）
    const banner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'STAGE CLEAR!', {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        color: '#ffe066',
        stroke: '#3a2a00',
        strokeThickness: 6,
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(Depth.Overlay)
      .setScale(0.3);
    this.tweens.add({
      targets: banner,
      scale: 1,
      duration: 350,
      ease: 'Back.easeOut'
    });

    const sub = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, '街がピカピカになった！', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#0e1320aa',
        padding: { x: 10, y: 4 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(Depth.Overlay)
      .setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, duration: 400, delay: 250 });

    // 紙吹雪
    this.spawnConfetti(GAME_WIDTH / 2, -20, 40);

    // 少し演出を見せてからリザルトへ
    this.time.delayedCall(1700, () => this.endGame(true));
  }

  // 紙吹雪（スクリーン固定）
  private spawnConfetti(centerX: number, topY: number, count: number): void {
    const colors = [0xff7a3d, 0xffe066, 0x66c674, 0x4aa8e0, 0xff7eb6, 0xa6e3ff];
    for (let i = 0; i < count; i++) {
      const x = centerX + (Math.random() - 0.5) * GAME_WIDTH * 0.9;
      const y = topY + Math.random() * 60;
      const c = colors[i % colors.length];
      const rect = this.add
        .rectangle(x, y, 8 + Math.random() * 6, 4 + Math.random() * 4, c, 1)
        .setScrollFactor(0)
        .setDepth(Depth.Overlay)
        .setAngle(Math.random() * 360);
      this.tweens.add({
        targets: rect,
        y: GAME_HEIGHT + 40,
        x: x + (Math.random() - 0.5) * 80,
        angle: rect.angle + (Math.random() < 0.5 ? -1 : 1) * 360,
        duration: 1500 + Math.random() * 800,
        ease: 'Cubic.easeIn',
        onComplete: () => rect.destroy()
      });
    }
  }

  // ---------------- 終了 ----------------

  private endGame(cleared: boolean): void {
    if (this.resultSent) return;
    this.resultSent = true;
    this.isOver = true;
    const cleanliness = this.cleanliness.value;

    let baseScore = this.score.score;
    if (cleared) {
      const timeBonus = this.timeLeft * SCORE_TIME_BONUS_PER_SEC;
      const cleanBonus = Math.floor(cleanliness * SCORE_CLEANLINESS_BONUS_PER_PCT);
      this.score.addBonus(timeBonus + cleanBonus);
      baseScore = this.score.score;
    }

    const rank: Rank = this.calcRank(cleanliness, cleared);
    const result: RunResult = {
      score: baseScore,
      cleanliness,
      picked: this.score.picked,
      sortedCorrect: this.score.sortedCorrect,
      sortedWrong: this.score.sortedWrong,
      remainingSec: this.timeLeft,
      cleared,
      rank,
      maxCombo: this.combo.max,
      levelIndex: this.levelIndex,
      levelName: this.level.name
    };

    // 一拍おいてリザルトへ
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(550, () => this.scene.start(SceneKeys.Result, { result }));
  }

  // ランクは level.targetCleanliness を基準に算出
  private calcRank(cleanliness: number, cleared: boolean): Rank {
    if (!cleared) return 'C';
    const target = this.level.targetCleanliness;
    if (cleanliness >= target + 15) return 'S';
    if (cleanliness >= target) return 'A';
    if (cleanliness >= target - 15) return 'B';
    return 'C';
  }

  // ビン凡例（HUD/ResultでカテゴリColorを使うため）
  static categoryColor(c: TrashCategory): number {
    return CATEGORIES[c].color;
  }
}
