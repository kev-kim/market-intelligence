"use client"

import "reactflow/dist/style.css"
import { useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  type Node,
  type Edge,
  MarkerType,
  BackgroundVariant,
} from "reactflow"
import { api, type GraphNode, type GraphEdge } from "@/lib/api"
import { formatKRWShort } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

// ── sector → hsl hue mapping ──────────────────────────────────────────
const SECTOR_HUE: Record<string, number> = {
  "핀테크": 213,
  "커머스": 152,
  "헬스케어": 280,
  "바이오": 152,
  "AI": 190,
  "SaaS": 40,
  "모빌리티": 2,
  "엔터테인먼트": 330,
  "게임": 90,
  "부동산": 38,
  "물류": 200,
  "교육": 60,
  "보안": 0,
  "반도체": 260,
}

function getSectorHue(sector?: string): number {
  if (!sector) return 220
  const exact = SECTOR_HUE[sector]
  if (exact != null) return exact
  // deterministic hash fallback
  let h = 0
  for (let i = 0; i < sector.length; i++) h = (h * 31 + sector.charCodeAt(i)) & 0xffff
  return h % 360
}

// ── layout computation ─────────────────────────────────────────────────
const NODE_W = 160
const NODE_H_COMPANY = 56
const NODE_H_INVESTOR = 36

/**
 * Radial hub layout. Companies sit on an inner circle; each investor is placed
 * at the *circular mean* angle of the companies it backs, on an outer ring — so
 * co-investors naturally sit between their shared portfolio. A focus company
 * (mini-graph on a profile) is pinned to the center.
 */
function computeLayout(
  gnodes: GraphNode[],
  gedges: GraphEdge[]
): { rfNodes: Node[]; rfEdges: Edge[] } {
  const investors = gnodes.filter((n) => n.type === "investor")
  const companies = gnodes.filter((n) => n.type === "company")
  const focus = companies.find((c) => c.focus)

  // Stable ordering: highest valuation first, walking around the circle.
  const ring = companies
    .filter((c) => c.id !== focus?.id)
    .sort((a, b) => (b.valuation_krw ?? 0) - (a.valuation_krw ?? 0))

  const n = Math.max(1, ring.length)
  // Inner radius scales with company count so labels don't collide.
  const Rc = Math.max(360, (NODE_W * n) / (2 * Math.PI) * 1.15)
  const Ro = Rc + 260

  const posMap = new Map<string, { x: number; y: number }>()
  const companyAngle = new Map<string, number>()

  if (focus) posMap.set(focus.id, { x: 0, y: 0 })

  ring.forEach((c, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2
    companyAngle.set(c.id, a)
    posMap.set(c.id, { x: Rc * Math.cos(a), y: Rc * Math.sin(a) })
  })
  // The focused company contributes the "up" angle so its investors cluster near it.
  if (focus) companyAngle.set(focus.id, -Math.PI / 2)

  // Map investor → angles of companies it backs (via edges).
  const invAngles = new Map<string, number[]>()
  for (const e of gedges) {
    if (!e.source.startsWith("inv:")) continue
    const a = companyAngle.get(e.target)
    if (a == null) continue
    const arr = invAngles.get(e.source) ?? []
    arr.push(a)
    invAngles.set(e.source, arr)
  }

  investors.forEach((inv, idx) => {
    const angles = invAngles.get(inv.id) ?? []
    let a: number
    if (angles.length) {
      const sx = angles.reduce((s, x) => s + Math.cos(x), 0) / angles.length
      const sy = angles.reduce((s, x) => s + Math.sin(x), 0) / angles.length
      a = Math.atan2(sy, sx)
    } else {
      a = (idx / Math.max(1, investors.length)) * 2 * Math.PI
    }
    // Stagger radius in bands to reduce overlap of investors near the same angle.
    const r = Ro + (idx % 4) * 78
    posMap.set(inv.id, { x: r * Math.cos(a), y: r * Math.sin(a) })
  })

  const rfNodes: Node[] = gnodes.map((n) => {
    const pos = posMap.get(n.id) ?? { x: 0, y: 0 }
    const isCompany = n.type === "company"
    const hue = getSectorHue(n.sector)
    const size = isCompany
      ? Math.max(140, Math.min(200, 140 + Math.log10(Math.max(1, n.valuation_krw ?? 1)) * 4))
      : NODE_W

    const style: React.CSSProperties = isCompany
      ? {
          width: size,
          height: NODE_H_COMPANY,
          background: `hsl(${hue} 55% 14%)`,
          border: n.focus
            ? `2px solid hsl(${hue} 80% 60%)`
            : `1px solid hsl(${hue} 40% 28%)`,
          borderRadius: "6px",
          boxShadow: n.focus
            ? `0 0 0 3px hsl(${hue} 70% 40% / 0.35), 0 2px 8px hsl(0 0% 0% / 0.4)`
            : "0 1px 4px hsl(0 0% 0% / 0.3)",
          color: `hsl(${hue} 60% 88%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "6px 10px",
          fontSize: "12px",
          lineHeight: 1.3,
          cursor: "pointer",
          userSelect: "none",
        }
      : {
          width: size,
          height: NODE_H_INVESTOR,
          background: "hsl(var(--secondary))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "9999px",
          color: "hsl(var(--secondary-foreground))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 14px",
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.01em",
          cursor: "default",
          userSelect: "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }

    return {
      id: n.id,
      type: "default",
      position: pos,
      data: {
        label: isCompany ? (
          <div style={{ width: "100%" }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "12px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: size - 20,
              }}
            >
              {n.label}
            </div>
            {n.valuation_krw != null && (
              <div style={{ fontSize: "10px", opacity: 0.7, marginTop: "1px" }}>
                {formatKRWShort(n.valuation_krw)}
                {n.stage ? ` · ${n.stage}` : ""}
              </div>
            )}
          </div>
        ) : (
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: size - 28,
              display: "block",
            }}
          >
            {n.label}
          </span>
        ),
      },
      style,
    }
  })

  const rfEdges: Edge[] = gedges.map((e) => {
    const isLead = e.kind === "lead"
    const isAcquired = e.kind === "acquired"
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: isLead,
      label: isAcquired ? "인수" : undefined,
      labelStyle: isAcquired
        ? {
            fontSize: 10,
            fill: "hsl(38 90% 56%)",
            fontWeight: 500,
          }
        : undefined,
      labelBgStyle: isAcquired
        ? { fill: "hsl(var(--card))", fillOpacity: 0.85 }
        : undefined,
      markerEnd: isAcquired
        ? { type: MarkerType.ArrowClosed, color: "hsl(38 90% 56%)", width: 14, height: 14 }
        : undefined,
      style: isAcquired
        ? { stroke: "hsl(38 90% 56%)", strokeWidth: 1.5, strokeDasharray: "4 3" }
        : isLead
        ? { stroke: "hsl(var(--primary))", strokeWidth: 2.5, opacity: 0.9 }
        : { stroke: "hsl(var(--border))", strokeWidth: 1, opacity: 0.6 },
    }
  })

  return { rfNodes, rfEdges }
}

// ── inner component (must be inside ReactFlowProvider) ─────────────────
function NetworkGraphInner({
  companyId,
  height,
}: {
  companyId?: string
  height: number
}) {
  const router = useRouter()

  const { data, isLoading, isError } = useQuery({
    queryKey: companyId ? ["network", companyId] : ["network"],
    queryFn: () =>
      companyId ? api.getCompanyNetwork(companyId) : api.getNetworkGraph(),
    staleTime: 60_000,
  })

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!data) return { rfNodes: [], rfEdges: [] }
    return computeLayout(data.nodes, data.edges)
  }, [data])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const id = node.id
      if (id.startsWith("inv:")) {
        router.push(`/investors/${encodeURIComponent(id.slice(4))}`)
        return
      }
      if (id.startsWith("co:")) return // synthetic (untracked) acquisition target
      router.push(`/companies/${id}`)
    },
    [router]
  )

  if (isLoading) {
    return (
      <div style={{ height }} className="flex flex-col gap-3 p-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (isError || !data || data.nodes.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-muted-foreground text-sm"
      >
        데이터 없음 / No data
      </div>
    )
  }

  return (
    <div style={{ height, width: "100%" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.15}
        maxZoom={2.5}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="hsl(var(--border))"
          style={{ opacity: 0.5 }}
        />
        <Controls
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
        <MiniMap
          nodeColor={(n) => {
            const style = n.style as React.CSSProperties | undefined
            return (style?.background as string) ?? "hsl(var(--secondary))"
          }}
          maskColor="hsl(var(--background) / 0.7)"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
      </ReactFlow>
    </div>
  )
}

// ── public export (wraps in provider) ─────────────────────────────────
export function NetworkGraph({
  companyId,
  height = 600,
}: {
  companyId?: string
  height?: number
}) {
  return (
    <ReactFlowProvider>
      <NetworkGraphInner companyId={companyId} height={height} />
    </ReactFlowProvider>
  )
}
