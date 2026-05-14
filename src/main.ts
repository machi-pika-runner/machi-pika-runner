import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { Debug } from './game/utils/debugDiagnostics';
import { SceneKeys } from './game/constants';

// URL パラメタ ?debug=1 を読む（本番では何もしない）
const params = new URLSearchParams(window.location.search);
const debugOn = params.get('debug') === '1';
const noScaleTween = params.get('noScaleTween') === '1';
Debug.init({ enabled: debugOn, noScaleTween });

// Phaser ゲームインスタンスを生成
const game = new Phaser.Game(gameConfig);

// ?debug=1 の時だけ window に診断 API を生やす（本番では生やさない）
if (debugOn) {
  type SceneWithDebug = Phaser.Scene & {
    debugSnapshot?: () => unknown;
    player?: { debugSnapshot?: () => unknown };
    input2?: { debugSnapshot?: () => unknown; resetAll?: () => void };
    paused?: boolean;
    isOver?: boolean;
  };
  const findGameScene = (): SceneWithDebug | null => {
    const scenes = game.scene.getScenes(true) as SceneWithDebug[];
    return scenes.find((s) => s.scene.key === SceneKeys.Game) ?? null;
  };
  const api = {
    dump(): unknown {
      const gs = findGameScene();
      const scenePart = gs?.debugSnapshot?.() ?? null;
      const playerPart = gs?.player?.debugSnapshot?.() ?? null;
      const inputPart = gs?.input2?.debugSnapshot?.() ?? null;
      const data = {
        diag: Debug.dump(),
        scene: scenePart,
        player: playerPart,
        input: inputPart
      };
      // eslint-disable-next-line no-console
      console.warn('[MACHI_DEBUG] full dump', data);
      return data;
    },
    lastFrames(n?: number) {
      return Debug.lastFrames(n);
    },
    lastEvents(n?: number) {
      return Debug.lastEvents(n);
    },
    getCurrentSnapshot() {
      return Debug.getCurrentSnapshot();
    },
    forceResume(): string {
      const gs = findGameScene();
      if (!gs) return 'no GameScene';
      // 物理ワールド再開
      gs.physics.world.isPaused = false;
      // シーン自体が pause されていたら resume
      if (game.scene.isPaused(SceneKeys.Game)) game.scene.resume(SceneKeys.Game);
      gs.paused = false;
      Debug.pushEvent('forceResume invoked');
      return 'resumed';
    },
    resetInput(): string {
      const gs = findGameScene();
      gs?.input2?.resetAll?.();
      Debug.pushEvent('resetInput invoked');
      return 'reset';
    },
    game,
    get scene(): SceneWithDebug | null {
      return findGameScene();
    },
    get player(): unknown {
      return findGameScene()?.player ?? null;
    }
  };
  (window as unknown as { __MACHI_DEBUG__: typeof api }).__MACHI_DEBUG__ = api;
  // eslint-disable-next-line no-console
  console.warn('[MACHI_DEBUG] window.__MACHI_DEBUG__ available. Try .dump() / .lastFrames() / .forceResume() / .resetInput()');
}
