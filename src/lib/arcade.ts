import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Haptics                                                            */
/* ------------------------------------------------------------------ */

let hapticsOn = true;
let soundOn = true;

export const settings = {
  get haptics() {
    return hapticsOn;
  },
  set haptics(v: boolean) {
    hapticsOn = v;
    try {
      localStorage.setItem("na:haptics", v ? "1" : "0");
    } catch {
      /* ignore */
    }
  },
  get sound() {
    return soundOn;
  },
  set sound(v: boolean) {
    soundOn = v;
    try {
      localStorage.setItem("na:sound", v ? "1" : "0");
    } catch {
      /* ignore */
    }
  },
};

try {
  hapticsOn = localStorage.getItem("na:haptics") !== "0";
  soundOn = localStorage.getItem("na:sound") !== "0";
} catch {
  /* ignore */
}

export function haptic(pattern: number | number[] = 12) {
  if (!hapticsOn) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  Tiny WebAudio sound engine (no assets needed)                      */
/* ------------------------------------------------------------------ */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  duration = 0.12,
  type: OscillatorType = "sine",
  gain = 0.12,
  slideTo?: number,
) {
  if (!soundOn) return;
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + duration);
  }
  g.gain.setValueAtTime(0.0001, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(g).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration + 0.02);
}

export const sfx = {
  tap: () => tone(620, 0.07, "triangle", 0.1),
  pop: () => tone(880, 0.1, "triangle", 0.12, 1320),
  merge: (level: number) => tone(260 + level * 55, 0.14, "sine", 0.13),
  swipe: () => tone(300, 0.07, "sine", 0.06, 200),
  good: () => {
    tone(660, 0.1, "triangle", 0.1);
    setTimeout(() => tone(990, 0.14, "triangle", 0.1), 80);
  },
  bad: () => tone(180, 0.22, "sawtooth", 0.09, 90),
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => tone(f, 0.16, "triangle", 0.11), i * 90),
    );
  },
  over: () => {
    [440, 330, 220].forEach((f, i) =>
      setTimeout(() => tone(f, 0.24, "sawtooth", 0.08), i * 130),
    );
  },
  tick: () => tone(1400, 0.04, "square", 0.04),
};

export function unlockAudio() {
  audio();
}

/* ------------------------------------------------------------------ */
/*  High scores                                                        */
/* ------------------------------------------------------------------ */

export type ScoreMode = "high" | "low";

export function readBest(key: string): number | null {
  try {
    const raw = localStorage.getItem(`na:best:${key}`);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}

export function useBest(key: string, mode: ScoreMode = "high") {
  const [best, setBest] = useState<number | null>(() => readBest(key));
  const ref = useRef<number | null>(best);
  ref.current = best;

  const submit = useCallback(
    (value: number) => {
      const prev = ref.current;
      const isRecord =
        prev === null || (mode === "high" ? value > prev : value < prev);
      if (isRecord) {
        ref.current = value;
        setBest(value);
        try {
          localStorage.setItem(`na:best:${key}`, String(value));
        } catch {
          /* ignore */
        }
      }
      return isRecord;
    },
    [key, mode],
  );

  return { best, submit };
}

export function bumpPlays(key: string) {
  try {
    const n = Number(localStorage.getItem(`na:plays:${key}`) ?? 0) + 1;
    localStorage.setItem(`na:plays:${key}`, String(n));
  } catch {
    /* ignore */
  }
}

export function readPlays(key: string): number {
  try {
    return Number(localStorage.getItem(`na:plays:${key}`) ?? 0);
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Swipe gesture hook                                                 */
/* ------------------------------------------------------------------ */

export type Dir = "up" | "down" | "left" | "right";

export function useSwipe(onSwipe: (d: Dir) => void, threshold = 24) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const handler = useRef(onSwipe);
  handler.current = onSwipe;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!start.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
      if (Math.abs(dx) > Math.abs(dy)) handler.current(dx > 0 ? "right" : "left");
      else handler.current(dy > 0 ? "down" : "up");
    },
    [threshold],
  );

  // mouse support for desktop preview
  const mouseStart = useRef<{ x: number; y: number } | null>(null);
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    mouseStart.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!mouseStart.current) return;
      const dx = e.clientX - mouseStart.current.x;
      const dy = e.clientY - mouseStart.current.y;
      mouseStart.current = null;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
      if (Math.abs(dx) > Math.abs(dy)) handler.current(dx > 0 ? "right" : "left");
      else handler.current(dy > 0 ? "down" : "up");
    },
    [threshold],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        handler.current(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { onTouchStart, onTouchEnd, onMouseDown, onMouseUp };
}

/* ------------------------------------------------------------------ */
/*  Misc                                                               */
/* ------------------------------------------------------------------ */

export function useInterval(cb: () => void, delay: number | null) {
  const saved = useRef(cb);
  saved.current = cb;
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const fmtTime = (ms: number) => {
  const s = Math.max(0, ms) / 1000;
  return `${s.toFixed(1)}s`;
};
