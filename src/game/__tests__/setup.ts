// Phaser が必要とするブラウザ API の最小スタブ
// (EventEmitter のみ使うテストでは Canvas/WebGL は不要だが念のため定義)
if (typeof (globalThis as Record<string, unknown>).WebGLRenderingContext === 'undefined') {
  (globalThis as Record<string, unknown>).WebGLRenderingContext = class {};
}
