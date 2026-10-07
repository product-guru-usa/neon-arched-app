import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { Btn, GameHeader, ResultSheet, Stat } from "../components/ui";
import { bumpPlays, haptic, sfx, shuffle, useBest, useInterval } from "../lib/arcade";

const SYMBOLS = ["🚀", "👾", "💎", "🔥", "⚡", "🌙", "🍄", "🎧"];

type Card = { id: number; sym: string; flipped: boolean; matched: boolean };

const build = (): Card[] =>
  shuffle([...SYMBOLS, ...SYMBOLS]).map((sym, id) => ({
    id,
    sym,
    flipped: false,
    matched: false,
  }));

export default function MemoryMatch({ onHome }: { onHome: () => void }) {
  const [cards, setCards] = useState<Card[]>(build);
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [record, setRecord] = useState(false);
  const [wrong, setWrong] = useState(false);
  const lock = useRef(false);
  const { best, submit } = useBest("memory", "low");

  useEffect(() => {
    bumpPlays("memory");
  }, []);

  useInterval(() => setElapsed((e) => e + 100), running ? 100 : null);

  const reset = useCallback(() => {
    setCards(build());
    setPicked([]);
    setMoves(0);
    setElapsed(0);
    setRunning(false);
    setDone(false);
    setRecord(false);
    lock.current = false;
    bumpPlays("memory");
  }, []);

  const flip = (idx: number) => {
    if (lock.current || done) return;
    const card = cards[idx];
    if (card.flipped || card.matched) return;
    if (!running) setRunning(true);

    haptic(10);
    sfx.tap();
    const next = cards.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    setCards(next);
    const sel = [...picked, idx];
    setPicked(sel);

    if (sel.length < 2) return;

    setMoves((m) => m + 1);
    lock.current = true;
    const [a, b] = sel;

    if (next[a].sym === next[b].sym) {
      sfx.good();
      haptic([12, 40, 12]);
      setTimeout(() => {
        setCards((cur) =>
          cur.map((c, i) =>
            i === a || i === b ? { ...c, matched: true, flipped: true } : c,
          ),
        );
        setPicked([]);
        lock.current = false;
        const remaining = next.filter((c) => !c.matched).length - 2;
        if (remaining === 0) {
          setRunning(false);
          setDone(true);
          sfx.win();
          setRecord(submit(moves + 1));
        }
      }, 320);
    } else {
      sfx.bad();
      haptic(28);
      setWrong(true);
      setTimeout(() => {
        setCards((cur) =>
          cur.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)),
        );
        setPicked([]);
        setWrong(false);
        lock.current = false;
      }, 700);
    }
  };

  const matched = cards.filter((c) => c.matched).length / 2;

  return (
    <div className="relative flex h-full flex-col">
      <GameHeader title="Memory Grid" onBack={onHome} />

      <div className="flex gap-2 px-4">
        <Stat label="Moves" value={moves} />
        <Stat label="Time" value={`${(elapsed / 1000).toFixed(1)}s`} />
        <Stat label="Pairs" value={`${matched}/8`} accent="text-emerald-300" />
      </div>

      <div className="mt-5 px-4">
        <div
          className={cn(
            "aspect-square w-full rounded-[26px] border border-white/10 bg-white/[0.03] p-3",
            wrong && "animate-shake",
          )}
        >
          <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-2.5">
            {cards.map((c, i) => {
              const face = c.flipped || c.matched;
              return (
                <button
                  key={c.id}
                  onPointerDown={() => flip(i)}
                  className="relative [perspective:700px]"
                >
                  <div
                    className={cn(
                      "h-full w-full rounded-2xl transition-transform duration-300 [transform-style:preserve-3d]",
                      face && "[transform:rotateY(180deg)]",
                    )}
                  >
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-violet-700/50 to-fuchsia-700/30 text-lg text-white/30 [backface-visibility:hidden]">
                      ?
                    </div>
                    <div
                      className={cn(
                        "absolute inset-0 flex items-center justify-center rounded-2xl border text-3xl [backface-visibility:hidden] [transform:rotateY(180deg)]",
                        c.matched
                          ? "border-emerald-400/50 bg-emerald-400/15 opacity-70"
                          : "border-white/15 bg-white/10",
                      )}
                    >
                      {c.sym}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs font-medium text-white/35">
        Find all 8 pairs in as few moves as possible
        {best !== null && ` · best ${best} moves`}
      </p>

      <div className="mt-auto px-4 pb-5 pt-4">
        <Btn variant="ghost" className="w-full" onClick={reset}>
          ⟳ Shuffle &amp; restart
        </Btn>
      </div>

      <ResultSheet
        open={done}
        emoji="🧠"
        title="All matched!"
        record={record}
        accent="from-emerald-400 to-teal-600"
        lines={[
          { label: "Moves", value: String(moves) },
          { label: "Time", value: `${(elapsed / 1000).toFixed(1)}s` },
          { label: "Fewest moves", value: String(best ?? moves) },
        ]}
        onReplay={reset}
        onHome={onHome}
      />
    </div>
  );
}
