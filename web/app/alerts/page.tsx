"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Bell,
  BellOff,
  CheckCheck,
  AlertTriangle,
  TrendingUp,
  LineChart,
  Zap,
  Circle,
} from "lucide-react"
import { mockApi } from "@/lib/mock-api"
import type { Alert, AlertType } from "@/lib/types"
import { cn, relativeTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

// ── alert type metadata ───────────────────────────────────────────────

const ALERT_META: Record<
  AlertType,
  {
    label: string
    labelKo: string
    variant: "success" | "warning" | "destructive" | "default" | "muted"
    icon: React.ElementType
  }
> = {
  new_funding: {
    label: "New Funding",
    labelKo: "신규 투자",
    variant: "success",
    icon: TrendingUp,
  },
  valuation_change: {
    label: "Valuation Change",
    labelKo: "기업가치 변동",
    variant: "default",
    icon: Zap,
  },
  ipo_filing: {
    label: "IPO Filing",
    labelKo: "IPO 공시",
    variant: "warning",
    icon: LineChart,
  },
  new_event: {
    label: "New Event",
    labelKo: "새 이벤트",
    variant: "default",
    icon: Bell,
  },
  conflict_detected: {
    label: "Conflict Detected",
    labelKo: "출처 불일치",
    variant: "warning",
    icon: AlertTriangle,
  },
}

// ── single alert row ──────────────────────────────────────────────────

function AlertRow({ alert }: { alert: Alert }) {
  const qc = useQueryClient()
  const router = useRouter()
  const isUnread = alert.read_at == null
  const meta = ALERT_META[alert.alert_type]
  const Icon = meta.icon

  const markReadMutation = useMutation({
    mutationFn: () => mockApi.markAlertRead(alert.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] })
    },
  })

  function handleClick() {
    if (isUnread) {
      markReadMutation.mutate()
    }
    if (alert.event_id) {
      router.push(`/events/${alert.event_id}`)
    } else {
      router.push(`/companies/${alert.company_id}`)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group w-full flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all",
        "hover:border-primary/40 hover:bg-muted/30",
        isUnread
          ? "bg-primary/3 border-primary/20"
          : "bg-card border-border opacity-70 hover:opacity-100"
      )}
    >
      {/* unread dot */}
      <div className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center">
        {isUnread ? (
          <Circle className="h-2 w-2 fill-primary text-primary" />
        ) : (
          <Circle className="h-2 w-2 fill-muted-foreground/30 text-muted-foreground/30" />
        )}
      </div>

      {/* icon */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          alert.alert_type === "new_funding" && "bg-positive/10 text-positive",
          alert.alert_type === "ipo_filing" && "bg-warning/10 text-warning",
          alert.alert_type === "conflict_detected" && "bg-warning/10 text-warning",
          alert.alert_type === "valuation_change" && "bg-primary/10 text-primary",
          alert.alert_type === "new_event" && "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={meta.variant}>{meta.labelKo}</Badge>
            <Badge variant="muted" className="hidden sm:inline-flex">
              {meta.label}
            </Badge>
          </div>
          <span className="shrink-0 text-2xs text-muted-foreground tnum">
            {relativeTime(alert.created_at)}
          </span>
        </div>
        <p
          className={cn(
            "mt-1.5 text-sm leading-snug",
            isUnread ? "font-medium" : "font-normal text-muted-foreground"
          )}
        >
          {alert.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {alert.detail}
        </p>
        {!isUnread && alert.read_at && (
          <p className="mt-1 text-2xs text-muted-foreground/50 tnum">
            읽음 · {relativeTime(alert.read_at)}
          </p>
        )}
      </div>
    </button>
  )
}

// ── skeleton ──────────────────────────────────────────────────────────

function AlertsSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────

type Filter = "all" | "unread"

export default function AlertsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>("all")

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => mockApi.listAlerts(),
  })

  const markAllMutation = useMutation({
    mutationFn: () => mockApi.markAllAlertsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] })
    },
  })

  const all = alerts ?? []
  const unreadCount = all.filter((a) => !a.read_at).length
  const displayed =
    filter === "unread" ? all.filter((a) => !a.read_at) : all

  return (
    <div className="space-y-5">
      {/* page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              알림 <span className="font-normal text-muted-foreground">/ Alerts</span>
            </h1>
            {unreadCount > 0 && (
              <Badge variant="default" className="tnum">
                {unreadCount}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            관심 기업의 새로운 이벤트와 데이터 충돌을 확인하세요.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            모두 읽음 / Mark All Read
          </Button>
        )}
      </div>

      {/* filter toggle */}
      <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1 w-fit">
        {(["all", "unread"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "flex items-center gap-1.5 rounded px-3 py-1 text-sm transition-colors",
              filter === f
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "all" ? (
              <>
                <Bell className="h-3.5 w-3.5" />
                전체 <span className="text-muted-foreground/60 tnum">({all.length})</span>
              </>
            ) : (
              <>
                <Circle className="h-3 w-3 fill-primary text-primary" />
                미읽음 <span className="text-muted-foreground/60 tnum">({unreadCount})</span>
              </>
            )}
          </button>
        ))}
      </div>

      <Separator />

      {/* feed */}
      {isLoading ? (
        <AlertsSkeleton />
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 py-16 text-center">
          <BellOff className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">
            {filter === "unread" ? "미읽은 알림 없음" : "알림 없음"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter === "unread"
              ? "모든 알림을 읽었습니다. / All caught up!"
              : "알림이 없습니다. / No alerts yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  )
}
