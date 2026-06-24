"use client";

export const ShaderBackground = () => (
  <div
    aria-hidden
    className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#060608] noise-overlay"
  >
    <div className="absolute top-[-10%] left-[-15%] w-[55%] h-[55%] rounded-full bg-primary/3 blur-[130px] animate-[glow-drift-1_20s_ease-in-out_infinite]" />
    <div className="absolute bottom-[-15%] right-[-10%] w-[65%] h-[65%] rounded-full bg-slate-800/10 blur-[160px] animate-[glow-drift-2_25s_ease-in-out_infinite]" />
    <div className="absolute top-[25%] left-[55%] w-[45%] h-[45%] rounded-full bg-zinc-800/15 blur-[140px] animate-[glow-drift-3_22s_ease-in-out_infinite]" />
  </div>
);
