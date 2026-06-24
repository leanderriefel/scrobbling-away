import type { ReactNode } from "react";

import { githubSourceUrl, GITHUB_REPO } from "@/docs/github";

const prose = "text-[14px] leading-[1.7] text-muted-foreground";

export function DocLead({ children }: { children: ReactNode }) {
  return <p className={`${prose} mb-2`}>{children}</p>;
}

export function DocsBody({ children }: { children: ReactNode }) {
  return <div className="grid gap-14">{children}</div>;
}

export function DocSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-3 text-[14px] font-medium text-foreground">{title}</h2>
      <div
        className={`grid gap-3 ${prose} [&_a]:text-foreground [&_a]:underline [&_a]:decoration-border/80 [&_a]:underline-offset-[3px] [&_strong]:font-medium [&_strong]:text-foreground`}
      >
        {children}
      </div>
    </section>
  );
}

export function DocSubsection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-20">
      <h3 className="mb-2 text-[13px] font-medium text-foreground">{title}</h3>
      <div
        className={`grid gap-2 ${prose} [&_a]:text-foreground [&_a]:underline [&_a]:decoration-border/80 [&_a]:underline-offset-[3px] [&_strong]:font-medium [&_strong]:text-foreground`}
      >
        {children}
      </div>
    </div>
  );
}

export function Callout({
  title,
  children,
}: {
  variant?: "note" | "assumption" | "warning";
  title?: string;
  children: ReactNode;
}) {
  return (
    <aside className="border-l border-border pl-3 text-[13px] leading-[1.6] text-muted-foreground">
      {title && <p className="mb-1 font-medium text-foreground">{title}</p>}
      <div>{children}</div>
    </aside>
  );
}

export function Formula({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto border border-border/60 py-2.5 pl-3 font-mono text-[12px] leading-[1.6] text-foreground/80">
      {children}
    </pre>
  );
}

export function MetricTable({
  rows,
}: {
  rows: Array<{ metric: string; meaning: string; formula?: string }>;
}) {
  return (
    <div className="overflow-x-auto border-t border-border/60">
      <table className="w-full min-w-[28rem] text-left">
        <thead>
          <tr className="border-b border-border/60">
            <th className="py-2 pr-4 text-[11px] font-normal text-muted-foreground">Metric</th>
            <th className="py-2 pr-4 text-[11px] font-normal text-muted-foreground">Meaning</th>
            <th className="py-2 text-[11px] font-normal text-muted-foreground">Rule</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.metric} className="border-b border-border/40 align-top">
              <td className="py-2.5 pr-4 text-[13px] text-foreground">{row.metric}</td>
              <td className="py-2.5 pr-4 text-[13px] text-muted-foreground">{row.meaning}</td>
              <td className="py-2.5 font-mono text-[11px] text-muted-foreground">
                {row.formula ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ThresholdTable({
  rows,
}: {
  rows: Array<{ name: string; value: string; usedIn: string }>;
}) {
  return (
    <div className="overflow-x-auto border-t border-border/60">
      <table className="w-full min-w-[24rem] text-left">
        <thead>
          <tr className="border-b border-border/60">
            <th className="py-2 pr-4 text-[11px] font-normal text-muted-foreground">Name</th>
            <th className="py-2 pr-4 text-[11px] font-normal text-muted-foreground">Value</th>
            <th className="py-2 text-[11px] font-normal text-muted-foreground">Used in</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-border/40 align-top">
              <td className="py-2.5 pr-4 font-mono text-[11px] text-foreground">{row.name}</td>
              <td className="py-2.5 pr-4 text-[13px] text-foreground">{row.value}</td>
              <td className="py-2.5 text-[13px] text-muted-foreground">{row.usedIn}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AlgorithmSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="grid gap-1.5 pl-4 [list-style-type:decimal] marker:text-muted-foreground/60">
      {steps.map((step) => (
        <li key={step} className="pl-1">
          {step}
        </li>
      ))}
    </ol>
  );
}

export function FileRef({ path }: { path: string }) {
  return (
    <a
      href={githubSourceUrl(path)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-[12px] text-foreground/80 underline decoration-border/80 underline-offset-[3px] transition-colors hover:text-foreground"
    >
      {path}
    </a>
  );
}

export function RepoLink({ children }: { children?: ReactNode }) {
  return (
    <a
      href={GITHUB_REPO}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground underline decoration-border/80 underline-offset-[3px] transition-colors hover:text-foreground/80"
    >
      {children ?? "leanderriefel/scrobbling-away"}
    </a>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="font-mono text-[12px] text-foreground/80">{children}</code>;
}
