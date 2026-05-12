// ハイスコアの簡易保存。LocalStorage が使えない環境でも例外を出さない。

const KEY = 'machi-pika-runner.highscore.v1';

export interface HighScoreRecord {
  score: number;
  rank: string;
  cleanliness: number;
  ts: number;
}

export const loadHighScore = (): HighScoreRecord | null => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HighScoreRecord;
  } catch {
    return null;
  }
};

export const saveHighScore = (rec: HighScoreRecord): void => {
  try {
    const prev = loadHighScore();
    if (!prev || rec.score > prev.score) {
      window.localStorage.setItem(KEY, JSON.stringify(rec));
    }
  } catch {
    /* noop */
  }
};

// ─── ステージクリア進捗 ───
const CLEARED_KEY = 'machi-pika-runner.cleared.v1';

export interface StageClearRecord {
  rank: string;
  score: number;
  cleanliness: number;
}

export const loadClearedStages = (): Record<number, StageClearRecord> => {
  try {
    const raw = window.localStorage.getItem(CLEARED_KEY);
    return raw ? (JSON.parse(raw) as Record<number, StageClearRecord>) : {};
  } catch {
    return {};
  }
};

export const markStageCleared = (levelIndex: number, rec: StageClearRecord): void => {
  try {
    const all = loadClearedStages();
    const prev = all[levelIndex];
    if (!prev || rec.score > prev.score) all[levelIndex] = rec;
    window.localStorage.setItem(CLEARED_KEY, JSON.stringify(all));
  } catch {
    /* noop */
  }
};

export const isStageUnlocked = (levelIndex: number): boolean => {
  if (levelIndex <= 0) return true;
  return loadClearedStages()[levelIndex - 1] !== undefined;
};

const MUTE_KEY = 'machi-pika-runner.mute.v1';
export const loadMuted = (): boolean => {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
};
export const saveMuted = (muted: boolean): void => {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* noop */
  }
};
