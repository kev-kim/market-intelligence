"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  ShieldCheck,
  BookmarkPlus,
  ChevronRight,
} from "lucide-react"
import { mockApi } from "@/lib/mock-api"
import type { CompanyListItem, Watchlist } from "@/lib/types"
import { EVENT_TYPE_LABEL } from "@/lib/format"
import { cn, relativeTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

// ── compact company row inside a watchlist ────────────────────────────

function WatchlistCompanyRow({
  company,
  onRemove,
}: {
  company: CompanyListItem
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors group">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/companies/${company.id}`}
            className="text-sm font-medium hover:text-primary transition-colors truncate"
          >
            {company.canonical_name_ko}
          </Link>
          {company.is_dart_anchored && (
            <ShieldCheck className="h-3 w-3 shrink-0 text-conf-high" />
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-2xs text-muted-foreground truncate">
            {company.canonical_name_en}
          </span>
          {company.latest_event && (
            <>
              <span className="text-2xs text-muted-foreground/50">·</span>
              <Link
                href={`/events/${company.latest_event.id}`}
                className="text-2xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-[180px]"
              >
                <Badge variant="muted" className="mr-1">
                  {EVENT_TYPE_LABEL[company.latest_event.event_type]}
                </Badge>
                {company.latest_event.occurred_on &&
                  relativeTime(company.latest_event.occurred_on)}
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Badge variant="outline">{company.stage}</Badge>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${company.canonical_name_ko} 삭제`}
          className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── add company dialog ────────────────────────────────────────────────

function AddCompanyDialog({
  watchlistId,
  watchlistName,
  alreadyIn,
}: {
  watchlistId: string
  watchlistName: string
  alreadyIn: string[]
}) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const { data: allCompanies } = useQuery({
    queryKey: ["companies-all"],
    queryFn: () => mockApi.listCompanies(),
  })

  const addMutation = useMutation({
    mutationFn: (companyId: string) =>
      mockApi.addToWatchlist(watchlistId, companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlists"] })
    },
  })

  const filtered = (allCompanies ?? []).filter((c) => {
    if (alreadyIn.includes(c.id)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.canonical_name_ko.toLowerCase().includes(q) ||
      c.canonical_name_en.toLowerCase().includes(q) ||
      c.aliases.some((a) => a.toLowerCase().includes(q))
    )
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookmarkPlus className="h-3.5 w-3.5" />
          기업 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>기업 추가 / Add Company</DialogTitle>
          <p className="text-sm text-muted-foreground">{watchlistName}</p>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="기업 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-0.5 -mx-1">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              결과 없음 / No results
            </p>
          ) : (
            filtered.slice(0, 30).map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => {
                  addMutation.mutate(company.id)
                  setOpen(false)
                  setSearch("")
                }}
                className="w-full flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">
                      {company.canonical_name_ko}
                    </span>
                    {company.is_dart_anchored && (
                      <ShieldCheck className="h-3 w-3 shrink-0 text-conf-high" />
                    )}
                  </div>
                  <span className="text-2xs text-muted-foreground truncate block">
                    {company.canonical_name_en} · {company.sector}
                  </span>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {company.stage}
                </Badge>
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              닫기
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── create watchlist dialog ───────────────────────────────────────────

function CreateWatchlistDialog() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

  const createMutation = useMutation({
    mutationFn: (n: string) => mockApi.createWatchlist(n),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlists"] })
      setOpen(false)
      setName("")
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          새 워치리스트
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>워치리스트 만들기 / New Watchlist</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="이름 입력..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              createMutation.mutate(name.trim())
            }
          }}
          autoFocus
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              취소
            </Button>
          </DialogClose>
          <Button
            size="sm"
            disabled={!name.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate(name.trim())}
          >
            만들기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── rename watchlist dialog ───────────────────────────────────────────

function RenameWatchlistDialog({
  watchlist,
}: {
  watchlist: Watchlist
}) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(watchlist.name)

  const renameMutation = useMutation({
    mutationFn: (n: string) => mockApi.renameWatchlist(watchlist.id, n),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlists"] })
      setOpen(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setName(watchlist.name) }}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="이름 변경"
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>이름 변경 / Rename</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              renameMutation.mutate(name.trim())
            }
          }}
          autoFocus
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">취소</Button>
          </DialogClose>
          <Button
            size="sm"
            disabled={!name.trim() || renameMutation.isPending}
            onClick={() => renameMutation.mutate(name.trim())}
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── delete watchlist button ───────────────────────────────────────────

function DeleteWatchlistDialog({ watchlist }: { watchlist: Watchlist }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => mockApi.deleteWatchlist(watchlist.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlists"] })
      setOpen(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="워치리스트 삭제"
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>워치리스트 삭제 / Delete Watchlist</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{watchlist.name}</span>을(를) 삭제할까요?
          이 작업은 되돌릴 수 없습니다.
          <br />
          <span className="text-muted-foreground/70">
            Delete &quot;{watchlist.name}&quot;? This cannot be undone.
          </span>
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">취소</Button>
          </DialogClose>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── single watchlist panel ────────────────────────────────────────────

function WatchlistPanel({
  watchlist,
  companies,
  isActive,
  onClick,
}: {
  watchlist: Watchlist
  companies: CompanyListItem[]
  isActive: boolean
  onClick: () => void
}) {
  const qc = useQueryClient()
  const members = companies.filter((c) => watchlist.company_ids.includes(c.id))

  const removeMutation = useMutation({
    mutationFn: (companyId: string) =>
      mockApi.removeFromWatchlist(watchlist.id, companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlists"] })
    },
  })

  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-colors",
        isActive && "border-primary/40 ring-1 ring-primary/20"
      )}
    >
      {/* header */}
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            isActive && "rotate-90"
          )}
        />
        <span className="flex-1 text-sm font-medium">{watchlist.name}</span>
        <Badge variant="muted">{watchlist.company_ids.length}개 기업</Badge>
      </button>

      {/* expanded body */}
      {isActive && (
        <>
          <Separator />
          <div className="p-3 space-y-1">
            {members.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                기업이 없습니다. 아래 버튼으로 추가하세요.
                <br />
                <span className="text-muted-foreground/60">No companies yet.</span>
              </p>
            ) : (
              members.map((company) => (
                <WatchlistCompanyRow
                  key={company.id}
                  company={company}
                  onRemove={() => removeMutation.mutate(company.id)}
                />
              ))
            )}
          </div>
          <Separator />
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
              <RenameWatchlistDialog watchlist={watchlist} />
              <DeleteWatchlistDialog watchlist={watchlist} />
            </div>
            <AddCompanyDialog
              watchlistId={watchlist.id}
              watchlistName={watchlist.name}
              alreadyIn={watchlist.company_ids}
            />
          </div>
        </>
      )}
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────

export default function WatchlistsPage() {
  const [activeId, setActiveId] = useState<string | null>(null)

  const { data: watchlists, isLoading } = useQuery({
    queryKey: ["watchlists"],
    queryFn: () => mockApi.listWatchlists(),
  })

  const { data: allCompanies } = useQuery({
    queryKey: ["companies-all"],
    queryFn: () => mockApi.listCompanies(),
  })

  const companies: CompanyListItem[] = allCompanies ?? []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  const wls = watchlists ?? []

  return (
    <div className="space-y-5">
      {/* page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            워치리스트 <span className="font-normal text-muted-foreground">/ Watchlists</span>
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            관심 기업을 그룹화하고 최신 이벤트를 모니터링하세요.
          </p>
        </div>
        <CreateWatchlistDialog />
      </div>

      {/* list */}
      {wls.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 py-16 text-center">
          <BookmarkPlus className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">워치리스트가 없습니다</p>
          <p className="text-xs text-muted-foreground mt-1">
            위의 버튼을 눌러 첫 번째 워치리스트를 만들어보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {wls.map((wl) => (
            <WatchlistPanel
              key={wl.id}
              watchlist={wl}
              companies={companies}
              isActive={activeId === wl.id}
              onClick={() => setActiveId((cur) => (cur === wl.id ? null : wl.id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
