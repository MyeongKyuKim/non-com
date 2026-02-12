// src/features/captcha/sim/dlgCore.js
// 추상/상상 유도용: "16개의 워커가 돌아다니며 농도(방문횟수)를 누적" -> 회색->검정

export function createRng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return function rand() {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function idx(x, y, w) {
  return y * w + x;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function initHeatmapState({
  w = 96,
  h = 96,
  seed = 1,
  walkers = 16,
  maxValue = 255, // 이 값에 가까울수록 검게(포화)
} = {}) {
  const rng = createRng(seed);

  // 방문 누적(0..maxValue). Uint16Array로 여유 있게.
  const field = new Uint16Array(w * h);

  // 워커 16개: 중앙 근처에서 시작 (원하면 랜덤으로 바꿔도 됨)
  const cx = Math.floor(w * 0.5);
  const cy = Math.floor(h * 0.5);

  const agents = Array.from({ length: walkers }, (_, i) => {
    // 살짝 흩뿌리기
    const x = clamp(cx + Math.floor((rng() - 0.5) * 10), 0, w - 1);
    const y = clamp(cy + Math.floor((rng() - 0.5) * 10), 0, h - 1);
    return { x, y };
  });

  // 초기 찍기
  const dirty = [];
  for (const a of agents) {
    const k = idx(a.x, a.y, w);
    field[k] = Math.min(maxValue, field[k] + 1);
    dirty.push({ x: a.x, y: a.y });
  }

  return {
    w,
    h,
    seed,
    rng,
    field,
    agents,
    dirty,     // 이번 step에서 변화(찍힌 좌표)만 담기
    maxValue,
  };
}

export function stepHeatmapN(state, n = 1) {
  const { w, h, field, agents, maxValue } = state;

  // 이번 프레임에서 찍힌 점만 모으기
  state.dirty.length = 0;

  for (let step = 0; step < n; step++) {
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];

      // 4방향 랜덤워크
      const r = state.rng();
      let dx = 0, dy = 0;
      if (r < 0.25) dx = 1;
      else if (r < 0.5) dx = -1;
      else if (r < 0.75) dy = 1;
      else dy = -1;

      a.x = clamp(a.x + dx, 0, w - 1);
      a.y = clamp(a.y + dy, 0, h - 1);

      // 방문 누적: 같은 곳 반복 방문하면 더 진해짐
      const k = idx(a.x, a.y, w);
      const next = field[k] + 1;
      field[k] = next > maxValue ? maxValue : next;

      state.dirty.push({ x: a.x, y: a.y });
    }
  }

  return state;
}
