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
  Plus,
  Trash2,
  Settings2,
} from "lucide-react"
import { api } from "@/lib/api"
import type { AlertRule, AlertRuleInput } from "@/lib/api"
import type { Alert, AlertType, EventType } from "@/lib/types"
import { cn, relativeTime, formatKRWShort } from "@/lib/utils"
import { EVENT_TYPE_LABEL } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

// ── event type label (Korean) ─────────────────────────────────────────

const EVENT_TYPE_LABEL_KO: Record<EventType, string> = {
  funding_round: "투자 유치",
  acquisition: "인수",
  merger: "합병",
  ipo_announcement: "IPO 공시",
  ipo_completion: "IPO 완료",
  profitability_milestone: "흑자 전환",
  partnership: "파트너십",
  executive_hire: "임원 영입",
  executive_departure: "임원 이탈",
}

const ALL_EVENT_TYPES: EventType[] = [
  "funding_round",
  "acquisition",
  "merger",
  "ipo_announcement",
  "ipo_completion",
  "profitability_milestone",
  "partnership",
  "executive_hire",
  "executive_departure",
]

const MIN_AMOUNT_PRESETS = [
  { label: "100억", value: 10_000_000_000 },
  { label: "500억", value: 50_000_000_000 },
  { label: "1000억", value: 100_000_000_000 },
  { label: "5000억", value: 500_000_000_000 },
]

// ── new rule dialog ───────────────────────────────────────────────────

interface NewRuleDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (count: number) => void
}

function NewRuleDialog({ open, onClose, onCreated }: NewRuleDialogProps) {
  const qc = useQueryClient()
  const [label, setLabel] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>([])
  const [scope, setScope] = useState<"all" | "watchlist">("all")
  const [selectedSectors, setSelectedSectors] = useState<string[]>([])
  const [minAmountKrw, setMinAmountKrw] = useState<number | undefined>(undefined)

  const { data: facets } = useQuery({
    queryKey: ["facets"],
    queryFn: () => api.getFacets(),
  })

  const createMutation = useMutation({
    mutationFn: (input: AlertRuleInput) => api.createAlertRule(input),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["alert-rules"] })
      qc.invalidateQueries({ queryKey: ["alerts"] })
      onCreated(result.created)
      handleClose()
    },
  })

  function handleClose() {
    setLabel("")
    setSelectedTypes([])
    setScope("all")
    setSelectedSectors([])
    setMinAmountKrw(undefined)
    onClose()
  }

  function toggleEventType(et: EventType) {
    setSelectedTypes((prev) =>
      prev.includes(et) ? prev.filter((x) => x !== et) : [...prev, et]
    )
  }

  function toggleSector(s: string) {
    setSelectedSectors((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  function toggleMinAmount(val: number) {
    setMinAmountKrw((prev) => (prev === val ? undefined : val))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || selectedTypes.length === 0) return
    createMutation.mutate({
      label: label.trim(),
      eventTypes: selectedTypes,
      scope,
      sectors: selectedSectors.length > 0 ? selectedSectors : undefined,
      minAmountKrw,
    })
  }

  const canSubmit = label.trim().length > 0 && selectedTypes.length > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            규칙 추가{" "}
            <span className="font-normal text-muted-foreground">/ New Alert Rule</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* label */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              규칙 이름 / Rule Label
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="예: 대형 시리즈B 이상 투자"
              autoFocus
            />
          </div>

          {/* event types */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              이벤트 유형 / Event Types
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_EVENT_TYPES.map((et) => (
                <button
                  key={et}
                  type="button"
                  onClick={() => toggleEventType(et)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors",
                    selectedTypes.includes(et)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  <span>{EVENT_TYPE_LABEL_KO[et]}</span>
                  <span className="opacity-60">{EVENT_TYPE_LABEL[et]}</span>
                </button>
              ))}
            </div>
            {selectedTypes.length === 0 && (
              <p className="text-xs text-destructive">최소 1개 이상 선택하세요.</p>
            )}
          </div>

          {/* scope */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">
                {scope === "watchlist" ? "관심목록 한정" : "전체 기업"}
              </p>
              <p className="text-xs text-muted-foreground">
                {scope === "watchlist"
                  ? "관심목록에 추가된 기업만 / Watchlist companies only"
                  : "데이터베이스 전체 기업 / All companies in database"}
              </p>
            </div>
            <Switch
              checked={scope === "watchlist"}
              onCheckedChange={(v) => setScope(v ? "watchlist" : "all")}
            />
          </div>

          {/* sector filter */}
          {facets && facets.sectors.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                섹터 필터 <span className="normal-case">(선택 / Optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {facets.sectors.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSector(s)}
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs transition-colors",
                      selectedSectors.includes(s)
                        ? "bg-secondary text-secondary-foreground border-secondary"
                        : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {selectedSectors.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  선택됨: {selectedSectors.join(", ")}
                </p>
              )}
            </div>
          )}

          {/* min amount */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              최소 투자금액 <span className="normal-case">(선택 / Optional)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MIN_AMOUNT_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => toggleMinAmount(preset.value)}
                  className={cn(
                    "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium tnum transition-colors",
                    minAmountKrw === preset.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {preset.label} 이상
                </button>
              ))}
            </div>
            {minAmountKrw != null && (
              <p className="text-xs text-muted-foreground tnum">
                {formatKRWShort(minAmountKrw)} 이상 이벤트만 알림
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              취소 / Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!canSubmit || createMutation.isPending}
            >
              {createMutation.isPending ? "생성 중…" : "규칙 추가 / Add Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── single rule card ──────────────────────────────────────────────────

function RuleCard({ rule }: { rule: AlertRule }) {
  const qc = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteAlertRule(rule.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alert-rules"] })
    },
  })

  return (
    <div className="group flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-border/80">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{rule.label}</span>
          <Badge variant="muted" className="shrink-0 text-2xs">
            {rule.scope === "watchlist" ? "관심목록" : "전체"}
          </Badge>
        </div>

        {/* event type badges */}
        <div className="flex flex-wrap gap-1">
          {rule.eventTypes.map((et) => (
            <span
              key={et}
              className="inline-flex items-center rounded border border-primary/20 bg-primary/8 px-1.5 py-0 text-2xs text-primary/80"
            >
              {EVENT_TYPE_LABEL_KO[et]}
            </span>
          ))}
        </div>

        {/* sector + min amount chips */}
        {(rule.sectors?.length || rule.minAmountKrw != null) && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {rule.sectors?.map((s) => (
              <span
                key={s}
                className="inline-flex items-center rounded border border-border bg-muted/50 px-1.5 py-0 text-2xs text-muted-foreground"
              >
                {s}
              </span>
            ))}
            {rule.minAmountKrw != null && (
              <span className="inline-flex items-center rounded border border-border bg-muted/50 px-1.5 py-0 text-2xs text-muted-foreground tnum">
                ≥ {formatKRWShort(rule.minAmountKrw)}
              </span>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100"
        title="규칙 삭제 / Delete rule"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ── rules section ─────────────────────────────────────────────────────

interface RulesSectionProps {
  onToast: (msg: string) => void
}

function RulesSection({ onToast }: RulesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: rules, isLoading } = useQuery({
    queryKey: ["alert-rules"],
    queryFn: () => api.listAlertRules(),
  })

  function handleCreated(count: number) {
    onToast(`${count}개 알림 생성됨 / ${count} alert${count !== 1 ? "s" : ""} generated`)
    setDialogOpen(false)
  }

  return (
    <>
      <Card className="border-border/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              알림 규칙{" "}
              <span className="font-normal text-muted-foreground">/ Alert Rules</span>
              {rules && rules.length > 0 && (
                <Badge variant="muted" className="tnum">
                  {rules.length}
                </Badge>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              규칙 추가 / New Rule
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : !rules || rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 py-6 text-center">
              <Settings2 className="h-6 w-6 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-medium text-muted-foreground">
                알림 규칙 없음 / No rules configured
              </p>
              <p className="text-2xs text-muted-foreground/60 mt-0.5">
                규칙을 추가하면 조건에 맞는 이벤트를 자동으로 알려드립니다.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <RuleCard key={rule.id} rule={rule} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NewRuleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />
    </>
  )
}

// ── single alert row ──────────────────────────────────────────────────

function AlertRow({ alert }: { alert: Alert }) {
  const qc = useQueryClient()
  const router = useRouter()
  const isUnread = alert.read_at == null
  const meta = ALERT_META[alert.alert_type]
  const Icon = meta.icon

  const markReadMutation = useMutation({
    mutationFn: () => api.markAlertRead(alert.id),
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

// ── toast banner ──────────────────────────────────────────────────────

function ToastBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-positive/30 bg-positive/8 px-4 py-2.5 text-sm text-positive">
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-positive/60 hover:text-positive transition-colors text-xs"
      >
        닫기
      </button>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────

type Filter = "all" | "unread"

export default function AlertsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>("all")
  const [toast, setToast] = useState<string | null>(null)

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api.listAlerts(),
  })

  const markAllMutation = useMutation({
    mutationFn: () => api.markAllAlertsRead(),
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

      {/* alert rules section */}
      <RulesSection onToast={(msg) => setToast(msg)} />

      {/* toast */}
      {toast && (
        <ToastBanner message={toast} onDismiss={() => setToast(null)} />
      )}

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
