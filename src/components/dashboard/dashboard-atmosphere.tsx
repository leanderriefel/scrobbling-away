"use client";

export function DashboardAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="dashboard-ambient-glow absolute -left-[20%] top-[-30%] size-[70%] rounded-full" />
      <div className="dashboard-ambient-glow-secondary absolute -right-[25%] top-[10%] size-[55%] rounded-full" />
      <div className="dashboard-ambient-glow absolute -bottom-[35%] left-[15%] size-[45%] rounded-full opacity-40" />
      <div className="dashboard-ambient-grid absolute inset-0" />
    </div>
  );
}
