"use client"

import { NetworkGraph } from "@/components/network-graph"

// ── legend items ────────────────────────────────────────────────────────
const NODE_LEGEND = [
  {
    label: "기업 / Company",
    shape: "rect" as const,
    bg: "hsl(213 55% 14%)",
    border: "hsl(213 40% 28%)",
    color: "hsl(213 60% 88%)",
  },
  {
    label: "투자자 / Investor",
    shape: "pill" as const,
    bg: "hsl(var(--secondary))",
    border: "hsl(var(--border))",
    color: "hsl(var(--secondary-foreground))",
  },
]

const EDGE_LEGEND = [
  {
    label: "리드 투자 / Lead",
    stroke: "hsl(var(--primary))",
    width: 2.5,
    dash: false,
  },
  {
    label: "참여 투자 / Invested",
    stroke: "hsl(var(--border))",
    width: 1,
    dash: false,
  },
  {
    label: "인수 / Acquired",
    stroke: "hsl(38 90% 56%)",
    width: 1.5,
    dash: true,
  },
]

export default function NetworkPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* ── page header ─────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              관계 그래프{" "}
              <span className="text-muted-foreground font-normal">/ Relationship Graph</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              투자자–기업 네트워크 —{" "}
              <span className="opacity-70">
                investor–company network. Click a company node to open its profile.
              </span>
            </p>
          </div>

          {/* ── legend ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-5 flex-wrap text-xs text-muted-foreground">
            {/* node legend */}
            {NODE_LEGEND.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                {item.shape === "rect" ? (
                  <span
                    style={{
                      display: "inline-block",
                      width: 24,
                      height: 14,
                      background: item.bg,
                      border: `1px solid ${item.border}`,
                      borderRadius: 3,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      display: "inline-block",
                      width: 28,
                      height: 14,
                      background: item.bg,
                      border: `1px solid ${item.border}`,
                      borderRadius: 9999,
                    }}
                  />
                )}
                <span>{item.label}</span>
              </div>
            ))}

            {/* divider */}
            <span className="w-px h-4 bg-border mx-1" />

            {/* edge legend */}
            {EDGE_LEGEND.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <svg width={28} height={10} aria-hidden>
                  <line
                    x1={2}
                    y1={5}
                    x2={26}
                    y2={5}
                    stroke={item.stroke}
                    strokeWidth={item.width}
                    strokeDasharray={item.dash ? "4 3" : undefined}
                  />
                  {item.dash && (
                    <polygon
                      points="22,2 26,5 22,8"
                      fill={item.stroke}
                    />
                  )}
                </svg>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── graph ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <NetworkGraph height={720} />
      </div>
    </div>
  )
}
