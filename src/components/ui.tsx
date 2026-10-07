import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { haptic, sfx } from "../lib/arcade";

/* ---------------------------------------------- Button */

export function Btn({
  children,
  onClick,
  variant = "primary",
  className,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
  disabled?: boolean;
}) {
  const styles = {
    primary:
      "bg-gradient-to-b from-fuchsia-500 to-violet-600 text-white shadow-[0_8px_24px_-6px_rgba(192,38,211,0.7)] border-white/20",
    ghost: "bg-white/5 text-white/80 border-white/10 backdrop-blur",
    danger: "bg-white/5 text-rose-300 border-rose-400/20",
  }[variant];

  return (
    <button
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        haptic(10);
        sfx.tap();
        onClick?.();
      }}
      className={cn(
        "rounded-2xl border px-5 py-3 text-sm font-semibold tracking-wide transition-all duration-150",
        "active:scale-[0.96] disabled:opacity-40",
        styles,
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------- Stat pill */

export function Stat({
  label,
  value,
  accent,
  pulse,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[76px] flex-1 flex-col items-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur",
        pulse && "border-rose-400/40 bg-rose-500/10",
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
        {label}
      </span>
      <span
        className={cn(
          "text-xl font-bold tabular-nums leading-tight",
          accent ?? "text-white",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ---------------------------------------------- Game header */

export function GameHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-2 pb-3">
      <button
        onClick={() => {
          haptic(8);
          onBack();
        }}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 active:scale-90"
        aria-label="Back"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h2 className="flex-1 text-center text-base font-extrabold uppercase tracking-[0.2em] text-white/90">
        {title}
      </h2>
      <div className="flex h-10 w-10 items-center justify-center">{right}</div>
    </div>
  );
}

/* ---------------------------------------------- Result overlay */

export function ResultSheet({
  open,
  title,
  emoji,
  lines,
  record,
  onReplay,
  onHome,
  accent = "from-fuchsia-500 to-violet-600",
}: {
  open: boolean;
  title: string;
  emoji: string;
  lines: { label: string; value: string }[];
  record?: boolean;
  onReplay: () => void;
  onHome: () => void;
  accent?: string;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full animate-slide-up rounded-[28px] border border-white/10 bg-[#0d0b1a] p-6 pb-7 shadow-2xl">
        <div className="mb-1 text-center text-5xl">{emoji}</div>
        <h3 className="text-center text-2xl font-black tracking-tight text-white">{title}</h3>
        {record && (
          <p className="mt-1 text-center text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
            ★ New personal best ★
          </p>
        )}
        <div className="my-5 space-y-2">
          {lines.map((l) => (
            <div
              key={l.label}
              className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-2.5"
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-white/45">
                {l.label}
              </span>
              <span className="text-lg font-bold tabular-nums text-white">{l.value}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Btn variant="ghost" className="flex-1" onClick={onHome}>
            Home
          </Btn>
          <Btn
            className={cn("flex-[1.4] bg-gradient-to-b", accent)}
            onClick={onReplay}
          >
            Play again
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------- Countdown */

export function Countdown({ value }: { value: number }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <span
        key={value}
        className="animate-pop text-8xl font-black text-white text-glow"
      >
        {value === 0 ? "GO!" : value}
      </span>
    </div>
  );
}
