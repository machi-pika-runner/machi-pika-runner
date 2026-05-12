import Phaser from 'phaser';
import { SceneKeys, type RunResult } from '../constants';
import { ResultPanel } from '../ui/ResultPanel';
import { markStageCleared, saveHighScore } from '../utils/storage';

interface ResultData {
  result: RunResult;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Result);
  }

  create(data: ResultData): void {
    const result = data.result;
    saveHighScore({
      score: result.score,
      rank: result.rank,
      cleanliness: result.cleanliness,
      ts: Date.now()
    });
    if (result.cleared) {
      markStageCleared(result.levelIndex, {
        rank: result.rank,
        score: result.score,
        cleanliness: result.cleanliness
      });
    }

    this.cameras.main.fadeIn(400, 0, 0, 0);
    new ResultPanel(
      this,
      result,
      () => this.scene.start(SceneKeys.Game, { levelIndex: result.levelIndex }),
      () => this.scene.start(SceneKeys.StageSelect),
      () => this.scene.start(SceneKeys.Game, { levelIndex: result.levelIndex + 1 })
    );
  }
}
