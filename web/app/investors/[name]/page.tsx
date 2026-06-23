"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronLeft,
  TrendingUp,
  Users,
  Star,
} from "lucide-react"
import { api } from "@/lib/api"
import { CompanyCard } from "@/components/company-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// ── not found ─────────────────────────────────────────────────────────────────

function NotFound({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
      <div className="rounded-full border bg-muted p-4">
        <TrendingUp className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="text-base font-medium">투자자를 찾을 수 없습니다</p>
        <p className="mt-1 text-sm text-muted-foreground">
          &ldquo;{name}&rdquo; — Investor not found or has no recorded portfolio.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/investors">
          <ChevronLeft className="h-3.5 w-3.5" />
          투자자 목록으로
        </Link>
      </Button>
    </div>
  )
}

// ── skeleton ─────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[180px] w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// ── stat pill ─────────────────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <div className="text-2xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  )
}

// ── portfolio card wrapper ────────────────────────────────────────────────────

function PortfolioCard({
  company,
  isLead,
  rounds,
}: {
  company: Parameters<typeof CompanyCard>[0]["company"]
  isLead: boolean
  rounds: string[]
}) {
  const action = (
    <div className="flex shrink-0 flex-col items-end gap-1">
      {isLead && (
        <Badge variant="default" className="text-2xs gap-0.5">
          <Star className="h-2.5 w-2.5" />
          리드
        </Badge>
      )}
      {rounds.length > 0 && (
        <div className="flex flex-wrap justify-end gap-1">
          {rounds.map((r) => (
            <Badge key={r} variant="muted" className="text-2xs">
              {r}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
  return <CompanyCard company={company} action={action} />
}

// ── co-investor row ───────────────────────────────────────────────────────────

function CoInvestorRow({
  name,
  shared,
}: {
  name: string
  shared: number
}) {
  return (
    <Link
      href={`/investors/${encodeURIComponent(name)}`}
      className="group flex items-center justify-between rounded-md border bg-card px-3 py-2.5 transition-colors hover:border-primary/40"
    >
      <span className="text-sm font-medium group-hover:text-primary truncate">
        {name}
      </span>
      <span className="ml-3 shrink-0 text-xs text-muted-foreground tabular-nums">
        공동 투자 {shared}건
      </span>
    </Link>
  )
}

// ── section header ─────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </p>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function InvestorProfilePage({
  params,
}: {
  params: { name: string }
}) {
  const name = decodeURIComponent(params.name)

  const { data: investor, isLoading, isError } = useQuery({
    queryKey: ["investor", name],
    queryFn: () => api.getInvestor(name),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* back link */}
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground" asChild>
          <Link href="/investors">
            <ChevronLeft className="h-3.5 w-3.5" />
            투자자 목록
          </Link>
        </Button>
        <ProfileSkeleton />
      </div>
    )
  }

  if (isError || !investor) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground" asChild>
          <Link href="/investors">
            <ChevronLeft className="h-3.5 w-3.5" />
            투자자 목록
          </Link>
        </Button>
        <NotFound name={name} />
      </div>
    )
  }

  const leadPortfolio = investor.portfolio.filter((p) => p.isLead)
  const nonLeadPortfolio = investor.portfolio.filter((p) => !p.isLead)

  return (
    <div className="space-y-6">
      {/* ── back link ───────────────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        asChild
      >
        <Link href="/investors">
          <ChevronLeft className="h-3.5 w-3.5" />
          투자자 목록
        </Link>
      </Button>

      {/* ── header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{investor.name}</h1>

        {/* stat pills */}
        <div className="mt-3 flex flex-wrap gap-2">
          <StatPill
            icon={<Users className="h-4 w-4" />}
            label="포트폴리오"
            value={`${investor.companyCount}개사`}
          />
          <StatPill
            icon={<Star className="h-4 w-4" />}
            label="리드 투자"
            value={`${investor.leadCount}건`}
          />
          <StatPill
            icon={<TrendingUp className="h-4 w-4" />}
            label="섹터"
            value={`${investor.sectors.length}개`}
          />
        </div>

        {/* sector chips */}
        {investor.sectors.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {investor.sectors.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* ── portfolio ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader>
          포트폴리오 / Portfolio ({investor.companyCount}개사)
        </SectionHeader>

        {/* lead investments first */}
        {leadPortfolio.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3" />
              리드 투자 ({leadPortfolio.length})
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {leadPortfolio.map((p) => (
                <PortfolioCard
                  key={p.company.id}
                  company={p.company}
                  isLead={p.isLead}
                  rounds={p.rounds}
                />
              ))}
            </div>
          </div>
        )}

        {/* other investments */}
        {nonLeadPortfolio.length > 0 && (
          <div className="space-y-2">
            {leadPortfolio.length > 0 && (
              <p className="text-xs font-medium text-muted-foreground">
                참여 투자 ({nonLeadPortfolio.length})
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {nonLeadPortfolio.map((p) => (
                <PortfolioCard
                  key={p.company.id}
                  company={p.company}
                  isLead={p.isLead}
                  rounds={p.rounds}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── co-investors ────────────────────────────────────────────────── */}
      {investor.coInvestors.length > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <SectionHeader>
              공동 투자자 / Co-investors ({investor.coInvestors.length})
            </SectionHeader>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {investor.coInvestors.map((ci) => (
                <CoInvestorRow key={ci.name} name={ci.name} shared={ci.shared} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
