import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { Btn, GameHeader, ResultSheet, Stat } from "../components/ui";
import { haptic, sfx, useBest, useSwipe, bumpPlays, type Dir } from "../lib/arcade";

type Board = number[][];

const SIZE = 4;

const empty = (): Board =>
  Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));

function emptyCells(b: Board) {
  const cells: [number, number][] = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) if (b[r][c] === 0) cells.push([r, c]);
  return cells;
}

function spawn(b: Board): Board {
  const cells = emptyCells(b);
  if (!cells.length) return b;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  const next = b.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slide(row: number[]) {
  const vals = row.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  let maxMerge = 0;
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] === vals[i + 1]) {
      const merged = vals[i] * 2;
      out.push(merged);
      gained += merged;
      maxMerge = Math.max(maxMerge, merged);
      i++;
    } else out.push(vals[i]);
  }
  while (out.length < SIZE) out.push(0);
  return { out, gained, maxMerge };
}

const rotateCW = (b: Board): Board =>
  b[0].map((_, c) => b.map((row) => row[c]).reverse());

function rotate(b: Board, times: number): Board {
  let out = b;
  for (let i = 0; i < ((times % 4) + 4) % 4; i++) out = rotateCW(out);
  return out;
}

const TURNS: Record<Dir, number> = { left: 0, up: 3, right: 2, down: 1 };

function move(b: Board, dir: Dir) {
  const t = TURNS[dir];
  const work = rotate(b, t);
  let gained = 0;
  let maxMerge = 0;
  const moved0 = work.map((row) => {
    const { out, gained: g, maxMerge: m } = slide(row);
    gained += g;
    maxMerge = Math.max(maxMerge, m);
    return out;
  });
  const next = rotate(moved0, 4 - t);
  const changed = JSON.stringify(next) !== JSON.stringify(b);
  return { next, gained, changed, maxMerge };
}

function hasMoves(b: Board) {
  if (emptyCells(b).length) return true;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (r + 1 < SIZE && b[r][c] === b[r + 1][c]) return true;
      if (c + 1 < SIZE && b[r][c] === b[r][c + 1]) return true;
    }
  return false;
}

const TILE: Record<number, string> = {
  2: "bg-slate-600/70 text-white/90",
  4: "bg-indigo-600/80 text-white",
  8: "bg-sky-500/85 text-white",
  16: "bg-cyan-400/90 text-slate-900",
  32: "bg-emerald-400/90 text-slate-900",
  64: "bg-lime-400/90 text-slate-900",
  128: "bg-amber-400/90 text-slate-900",
  256: "bg-orange-500/90 text-white",
  512: "bg-rose-500/90 text-white",
  1024: "bg-fuchsia-500/90 text-white",
  2048: "bg-violet-500 text-white shadow-[0_0_30px_rgba(167,139,250,0.85)]",
};

const tileClass = (v: number) =>
  TILE[v] ?? "bg-violet-400 text-white shadow-[0_0_34px_rgba(192,132,252,0.9)]";

function init(): Board {
  return spawn(spawn(empty()));
}

export default function Merge2048({ onHome }: { onHome: () => void }) {
  const [board, setBoard] = useState<Board>(init);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [record, setRecord] = useState(false);
  const [gain, setGain] = useState<{ id: number; v: number } | null>(null);
  const prev = useRef<{ board: Board; score: number } | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const { best, submit } = useBest("2048");
  const gainId = useRef(0);

  useEffect(() => {
    bumpPlays("2048");
  }, []);

  const boardRef = useRef(board);
  boardRef.current = board;

  const doMove = useCallback(
    (dir: Dir) => {
      if (over) return;
      const cur = boardRef.current;
      const { next, gained, changed, maxMerge } = move(cur, dir);
      if (!changed) {
        haptic(4);
        return;
      }
      prev.current = { board: cur, score };
      setCanUndo(true);
      const withNew = spawn(next);
      boardRef.current = withNew;
      setBoard(withNew);

      if (gained > 0) {
        sfx.merge(Math.log2(maxMerge));
        haptic(Math.min(40, 8 + maxMerge / 8));
        gainId.current += 1;
        setGain({ id: gainId.current, v: gained });
        setScore((s) => s + gained);
      } else {
        sfx.swipe();
        haptic(6);
      }
      if (!won && next.flat().some((v) => v >= 2048)) {
        setWon(true);
        sfx.win();
      }
      if (!hasMoves(withNew)) {
        setTimeout(() => {
          setOver(true);
          sfx.over();
          haptic([30, 60, 30]);
          setRecord(submit(score + gained));
        }, 220);
      }
    },
    [over, score, submit, won],
  );

  const swipe = useSwipe(doMove);

  const restart = () => {
    setBoard(init());
    setScore(0);
    setOver(false);
    setWon(false);
    setRecord(false);
    setCanUndo(false);
    prev.current = null;
    bumpPlays("2048");
  };

  const undo = () => {
    if (!prev.current) return;
    setBoard(prev.current.board);
    setScore(prev.current.score);
    prev.current = null;
    setCanUndo(false);
    haptic(14);
  };

  return (
    <div className="relative flex h-full flex-col">
      <GameHeader title="Neon 2048" onBack={onHome} />

      <div className="flex gap-2 px-4">
        <Stat label="Score" value={score} />
        <Stat label="Best" value={best ?? 0} accent="text-amber-300" />
      </div>

      <div className="relative mt-5 px-4">
        {gain && (
          <div
            key={gain.id}
            className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 animate-float-up text-2xl font-black text-emerald-300"
          >
            +{gain.v}
          </div>
        )}
        <div
          {...swipe}
          className="aspect-square w-full touch-none rounded-[26px] border border-white/10 bg-white/[0.03] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-2.5">
            {board.map((row, r) =>
              row.map((v, c) => (
                <div
                  key={`${r}-${c}`}
                  className="relative flex items-center justify-center rounded-2xl bg-white/[0.035]"
                >
                  {v > 0 && (
                    <div
                      key={v}
                      className={cn(
                        "animate-pop absolute inset-0 flex items-center justify-center rounded-2xl font-black tabular-nums",
                        v >= 1024 ? "text-xl" : v >= 128 ? "text-2xl" : "text-3xl",
                        tileClass(v),
                      )}
                    >
                      {v}
                    </div>
                  )}
                </div>
              )),
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs font-medium tracking-wide text-white/35">
        Swipe to merge tiles · reach 2048
      </p>

      <div className="mt-auto flex gap-3 px-4 pb-5 pt-4">
        <Btn variant="ghost" className="flex-1" onClick={undo} disabled={!canUndo}>
          ↩ Undo
        </Btn>
        <Btn variant="ghost" className="flex-1" onClick={restart}>
          ⟳ Restart
        </Btn>
      </div>

      {won && !over && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center">
          <div className="animate-pop rounded-full bg-violet-500/90 px-5 py-2 text-sm font-bold text-white shadow-lg">
            🎉 2048 reached — keep going!
          </div>
        </div>
      )}

      <ResultSheet
        open={over}
        emoji="🧊"
        title="Board jammed!"
        record={record}
        lines={[
          { label: "Score", value: String(score) },
          { label: "Best tile", value: String(Math.max(...board.flat())) },
          { label: "Record", value: String(best ?? score) },
        ]}
        onReplay={restart}
        onHome={onHome}
      />
    </div>
  );
}
