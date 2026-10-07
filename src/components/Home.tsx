import { useState } from "react";
import { cn } from "../utils/cn";
import { haptic, readBest, readPlays, settings, sfx, unlockAudio } from "../lib/arcade";

export type GameId = "2048" | "taprush" | "memory";

export const GAMES: {
  id: GameId;
  name: string;
  tag: string;
  blurb: string;
  emoji: string;
  grad: string;
  ring: string;
  unit: string;
  lower?: boolean;
}[] = [
  {
    id: "2048",
    name: "Neon 2048",
    tag: "Puzzle · Swipe",
    blurb: "Merge the glowing tiles and chase the 2048 block.",
    emoji: "🔷",
    grad: "from-violet-600 via-fuchsia-600 to-purple-700",
    ring: "shadow-[0_18px_40px_-16px_rgba(168,85,247,0.9)]",
    unit: "pts",
  },
  {
    id: "taprush",
    name: "Tap Rush",
    tag: "Reflex · 30 sec",
    blurb: "Smash orbs, build combos, dodge the bombs.",
    emoji: "⚡",
    grad: "from-cyan-500 via-sky-500 to-blue-700",
    ring: "shadow-[0_18px_40px_-16px_rgba(56,189,248,0.9)]",
    unit: "pts",
  },
  {
    id: "memory",
    name: "Memory Grid",
    tag: "Brain · Pairs",
    blurb: "Flip, remember, match all eight pairs.",
    emoji: "🧠",
    grad: "from-emerald-500 via-teal-500 to-cyan-700",
    ring: "shadow-[0_18px_40px_-16px_rgba(16,185,129,0.9)]",
    unit: "moves",
    lower: true,
  },
];

function Toggle({
  on,
  onChange,
  icon,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      onClick={() => {
        onChange(!on);
        haptic(12);
      }}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border text-base transition-all active:scale-90",
        on
          ? "border-fuchsia-400/40 bg-fuchsia-500/20 text-white"
          : "border-white/10 bg-white/5 text-white/30 line-through",
      )}
    >
      {icon}
    </button>
  );
}

export default function Home({ onPlay }: { onPlay: (id: GameId) => void }) {
  const [sound, setSound] = useState(settings.sound);
  const [vibe, setVibe] = useState(settings.haptics);

  const totalPlays = GAMES.reduce((n, g) => n + readPlays(g.id), 0);
  const records = GAMES.filter((g) => readBest(g.id) !== null).length;

  return (
    <div className="no-scrollbar flex h-full flex-col overflow-y-auto px-5 pb-8 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-700 text-lg shadow-[0_8px_22px_-6px_rgba(192,38,211,0.9)]">
            🕹️
          </div>
          <div className="leading-tight">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/40">
              Pocket
            </p>
            <p className="-mt-0.5 text-sm font-extrabold tracking-wide text-white">
              Arcade
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Toggle
            on={sound}
            label="Sound"
            icon="🔊"
            onChange={(v) => {
              settings.sound = v;
              setSound(v);
              if (v) {
                unlockAudio();
                sfx.pop();
              }
            }}
          />
          <Toggle
            on={vibe}
            label="Vibration"
            icon="📳"
            onChange={(v) => {
              settings.haptics = v;
              setVibe(v);
            }}
          />
        </div>
      </div>

      <h1 className="mt-7 text-[40px] font-black leading-[0.95] tracking-tight text-white text-glow">
        NEON
        <br />
        <span className="bg-gradient-to-r from-fuchsia-400 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
          ARCADE
        </span>
      </h1>
      <p className="mt-2 text-sm font-medium text-white/45">
        Three bite-sized games built for thumbs.
      </p>

      <div className="mt-5 flex gap-2.5">
        {[
          { k: "Games", v: GAMES.length },
          { k: "Rounds", v: totalPlays },
          { k: "Records", v: `${records}/3` },
        ].map((s) => (
          <div
            key={s.k}
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center backdrop-blur"
          >
            <p className="text-lg font-extrabold tabular-nums text-white">{s.v}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              {s.k}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">
        Choose your game
      </p>

      <div className="mt-3 space-y-3.5">
        {GAMES.map((g, i) => {
          const best = readBest(g.id);
          return (
            <button
              key={g.id}
              style={{ animationDelay: `${i * 70}ms` }}
              onPointerDown={() => {
                unlockAudio();
                haptic(14);
              }}
              onClick={() => {
                sfx.pop();
                onPlay(g.id);
              }}
              className={cn(
                "animate-slide-up w-full overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br p-[1.5px] text-left transition-transform active:scale-[0.975]",
                g.grad,
                g.ring,
              )}
            >
              <div className="relative flex items-center gap-4 rounded-[25px] bg-[#0a0814]/80 p-4 backdrop-blur-xl">
                <div
                  className={cn(
                    "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl",
                    g.grad,
                  )}
                >
                  {g.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                    {g.tag}
                  </p>
                  <p className="text-lg font-extrabold leading-tight text-white">
                    {g.name}
                  </p>
                  <p className="truncate text-xs text-white/45">{g.blurb}</p>
                  <p className="mt-1 text-[11px] font-bold tracking-wide text-amber-300/90">
                    {best === null
                      ? "No record yet"
                      : `★ Best ${best} ${g.unit}${g.lower ? " (lower is better)" : ""}`}
                  </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-7 text-center text-[11px] leading-relaxed text-white/25">
        Tip: add Neon Arcade to your Android home screen
        <br />
        for a fullscreen, offline-friendly arcade.
      </p>
    </div>
  );
}
