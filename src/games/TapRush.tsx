import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { Countdown, GameHeader, ResultSheet, Stat } from "../components/ui";
import { bumpPlays, haptic, sfx, useBest, useInterval } from "../lib/arcade";

type Kind = "orb" | "gold" | "bomb";
type Entity = { id: number; kind: Kind; born: number; life: number };

const ROUND = 30_000;
const TICK = 70;

const KIND_STYLE: Record<Kind, string> = {
  orb: "bg-gradient-to-br from-cyan-300 to-sky-500 shadow-[0_0_26px_rgba(56,189,248,0.75)]",
  gold: "bg-gradient-to-br from-amber-200 to-orange-500 shadow-[0_0_30px_rgba(251,191,36,0.85)]",
  bomb: "bg-gradient-to-br from-rose-500 to-red-700 shadow-[0_0_26px_rgba(244,63,94,0.75)]",
};

const KIND_ICON: Record<Kind, string> = { orb: "◉", gold: "★", bomb: "☠" };

export default function TapRush({ onHome }: { onHome: () => void }) {
  const [phase, setPhase] = useState<"count" | "play" | "over">("count");
  const [count, setCount] = useState(3);
  const [cells, setCells] = useState<(Entity | null)[]>(Array(9).fill(null));
  const [timeLeft, setTimeLeft] = useState(ROUND);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [record, setRecord] = useState(false);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);
  const [pops, setPops] = useState<{ id: number; cell: number; text: string; good: boolean }[]>([]);
  const endAt = useRef(0);
  const nextId = useRef(1);
  const { best, submit } = useBest("taprush");

  const reset = useCallback(() => {
    setCells(Array(9).fill(null));
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHits(0);
    setMisses(0);
    setRecord(false);
    setTimeLeft(ROUND);
    setCount(3);
    setPhase("count");
    bumpPlays("taprush");
  }, []);

  useEffect(() => {
    bumpPlays("taprush");
  }, []);

  // countdown
  useEffect(() => {
    if (phase !== "count") return;
    sfx.tick();
    const t = setTimeout(() => {
      if (count > 0) setCount((c) => c - 1);
      else {
        endAt.current = Date.now() + ROUND;
        setPhase("play");
        sfx.good();
      }
    }, 650);
    return () => clearTimeout(t);
  }, [phase, count]);

  const finish = useCallback(
    (finalScore: number) => {
      setPhase("over");
      setCells(Array(9).fill(null));
      sfx.over();
      haptic([25, 50, 25]);
      setRecord(submit(finalScore));
    },
    [submit],
  );

  const cellsRef = useRef<(Entity | null)[]>(cells);
  cellsRef.current = cells;

  useInterval(
    () => {
      const now = Date.now();
      const left = endAt.current - now;
      setTimeLeft(left);
      if (left <= 0) {
        finish(score);
        return;
      }
      const progress = 1 - left / ROUND;

      let expiredOrb = false;
      const next = cellsRef.current.map((e) => {
        if (e && now - e.born > e.life) {
          if (e.kind !== "bomb") expiredOrb = true;
          return null;
        }
        return e;
      });

      const active = next.filter(Boolean).length;
      const maxActive = 2 + Math.floor(progress * 2.4);
      if (active < maxActive && Math.random() < 0.42 + progress * 0.3) {
        const free = next.map((e, i) => (e ? -1 : i)).filter((i) => i >= 0);
        if (free.length) {
          const idx = free[Math.floor(Math.random() * free.length)];
          const roll = Math.random();
          const kind: Kind = roll < 0.16 ? "bomb" : roll < 0.26 ? "gold" : "orb";
          const base = 1250 - progress * 520;
          next[idx] = {
            id: nextId.current++,
            kind,
            born: now,
            life: kind === "gold" ? base * 0.65 : kind === "bomb" ? base * 1.1 : base,
          };
        }
      }

      cellsRef.current = next;
      setCells(next);

      if (expiredOrb) {
        setCombo(0);
        setMisses((m) => m + 1);
        setFlash("bad");
        setTimeout(() => setFlash(null), 180);
      }
    },
    phase === "play" ? TICK : null,
  );

  const addPop = (cell: number, text: string, good: boolean) => {
    const id = nextId.current++;
    setPops((p) => [...p, { id, cell, text, good }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 850);
  };

  const tap = (i: number) => {
    if (phase !== "play") return;
    const e = cells[i];
    if (!e) {
      setCombo(0);
      haptic(6);
      sfx.tap();
      return;
    }
    const cleared = cells.map((x, idx) => (idx === i ? null : x));
    cellsRef.current = cleared;
    setCells(cleared);

    if (e.kind === "bomb") {
      setScore((s) => Math.max(0, s - 25));
      setCombo(0);
      endAt.current -= 1500;
      setFlash("bad");
      setTimeout(() => setFlash(null), 220);
      addPop(i, "-25", false);
      sfx.bad();
      haptic([25, 40, 25]);
      return;
    }

    const nextCombo = combo + 1;
    const mult = Math.min(5, 1 + Math.floor(nextCombo / 4));
    const pts = (e.kind === "gold" ? 35 : 10) * mult;
    setCombo(nextCombo);
    setMaxCombo((m) => Math.max(m, nextCombo));
    setHits((h) => h + 1);
    setScore((s) => s + pts);
    addPop(i, `+${pts}`, true);
    setFlash("good");
    setTimeout(() => setFlash(null), 140);
    e.kind === "gold" ? sfx.pop() : sfx.tap();
    haptic(e.kind === "gold" ? 22 : 12);
  };

  const seconds = Math.max(0, timeLeft) / 1000;
  const low = seconds <= 5 && phase === "play";
  const mult = Math.min(5, 1 + Math.floor(combo / 4));
  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 100;

  return (
    <div className="relative flex h-full flex-col">
      <GameHeader title="Tap Rush" onBack={onHome} />

      <div className="flex gap-2 px-4">
        <Stat label="Score" value={score} />
        <Stat
          label="Time"
          value={seconds.toFixed(1)}
          pulse={low}
          accent={low ? "text-rose-300" : undefined}
        />
        <Stat
          label="Combo"
          value={`x${mult}`}
          accent={mult > 1 ? "text-emerald-300" : "text-white/70"}
        />
      </div>

      <div className="mx-4 mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-100 ease-linear",
            low ? "bg-rose-400" : "bg-gradient-to-r from-cyan-400 to-fuchsia-500",
          )}
          style={{ width: `${Math.max(0, (timeLeft / ROUND) * 100)}%` }}
        />
      </div>

      <div className="relative mt-5 px-4">
        <div
          className={cn(
            "aspect-square w-full rounded-[26px] border p-3 transition-colors duration-150",
            flash === "good"
              ? "border-emerald-400/40 bg-emerald-400/10"
              : flash === "bad"
                ? "border-rose-500/50 bg-rose-500/10"
                : "border-white/10 bg-white/[0.03]",
          )}
        >
          <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-3">
            {cells.map((e, i) => {
              const pop = pops.find((p) => p.cell === i);
              return (
                <button
                  key={i}
                  onPointerDown={() => tap(i)}
                  className="relative flex items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.035] active:scale-95"
                >
                  {e && (
                    <span
                      className={cn(
                        "animate-pop flex h-[78%] w-[78%] items-center justify-center rounded-full text-2xl font-black text-white/95",
                        KIND_STYLE[e.kind],
                      )}
                    >
                      {KIND_ICON[e.kind]}
                    </span>
                  )}
                  {pop && (
                    <span
                      key={pop.id}
                      className={cn(
                        "pointer-events-none absolute animate-float-up text-lg font-black",
                        pop.good ? "text-emerald-300" : "text-rose-300",
                      )}
                    >
                      {pop.text}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {phase === "count" && <Countdown value={count} />}
      </div>

      <p className="mt-4 px-6 text-center text-xs font-medium leading-relaxed text-white/35">
        Tap <span className="text-sky-300">◉ orbs</span> and{" "}
        <span className="text-amber-300">★ stars</span> fast. Avoid{" "}
        <span className="text-rose-300">☠ bombs</span> — they cost points and time.
      </p>

      <ResultSheet
        open={phase === "over"}
        emoji={score > (best ?? 0) ? "🏆" : "⏱️"}
        title="Time's up!"
        record={record}
        accent="from-cyan-400 to-sky-600"
        lines={[
          { label: "Score", value: String(score) },
          { label: "Best combo", value: `x${maxCombo}` },
          { label: "Accuracy", value: `${accuracy}%` },
          { label: "Record", value: String(best ?? score) },
        ]}
        onReplay={reset}
        onHome={onHome}
      />
    </div>
  );
}
