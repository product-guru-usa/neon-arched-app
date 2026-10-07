import type { ReactNode } from "react";

/**
 * Full-bleed on real phones; shows a device mock on larger screens so the
 * app always reads as a native Android game app.
 */
export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#05050c] sm:p-6">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-aura absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-fuchsia-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-32 h-[460px] w-[460px] animate-glow rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      <div
        className="relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#07061200] sm:h-[860px] sm:max-h-[92vh] sm:w-[400px] sm:rounded-[44px] sm:border-[10px] sm:border-[#15131f] sm:shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9),0_0_0_2px_rgba(255,255,255,0.06)]"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* status-bar-ish notch only on the mock */}
        <div className="pointer-events-none absolute left-1/2 top-2 z-40 hidden h-6 w-28 -translate-x-1/2 rounded-full bg-[#15131f] sm:block" />
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#0b0918] via-[#07060f] to-[#0a0616] sm:pt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
