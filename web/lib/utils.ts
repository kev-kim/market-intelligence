import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a KRW integer into a compact Korean-unit string.
 * 50_000_000_000 -> "500억" ; 1_200_000_000_000 -> "1조 2,000억"
 * Display only — the source of truth is always the integer.
 */
export function formatKRW(value: number | null | undefined): string {
  if (value == null) return "—"
  if (value === 0) return "0원"
  const jo = Math.floor(value / 1e12)
  const eok = Math.floor((value % 1e12) / 1e8)
  const man = Math.floor((value % 1e8) / 1e4)
  const parts: string[] = []
  if (jo > 0) parts.push(`${jo.toLocaleString()}조`)
  if (eok > 0) parts.push(`${eok.toLocaleString()}억`)
  if (jo === 0 && eok === 0 && man > 0) parts.push(`${man.toLocaleString()}만`)
  if (parts.length === 0) parts.push(`${value.toLocaleString()}`)
  return parts.join(" ") + (jo === 0 && eok === 0 && man === 0 ? "원" : "원")
}

/** USD-ish compact for the analyst eye: ₩500.0B */
export function formatKRWShort(value: number | null | undefined): string {
  if (value == null) return "—"
  const abs = Math.abs(value)
  if (abs >= 1e12) return `₩${(value / 1e12).toFixed(value % 1e12 === 0 ? 0 : 1)}T`
  if (abs >= 1e8) return `₩${(value / 1e8).toFixed(0)}억`
  if (abs >= 1e4) return `₩${(value / 1e4).toFixed(0)}만`
  return `₩${value.toLocaleString()}`
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—"
  return value.toLocaleString()
}

export function formatDate(
  iso: string | null | undefined,
  precision: "day" | "month" | "quarter" | "year" | "unknown" = "day"
): string {
  if (!iso) return "—"
  const d = new Date(iso + "T00:00:00")
  if (Number.isNaN(d.getTime())) return iso
  switch (precision) {
    case "year":
      return `${d.getFullYear()}`
    case "quarter":
      return `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`
    case "month":
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short" })
    case "unknown":
      return "Recent"
    default:
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
  }
}

/** Whole days between an ISO date and `now` (default today). */
export function daysBetween(iso: string, now: Date = new Date()): number {
  const then = new Date(iso + "T00:00:00").getTime()
  return Math.max(0, Math.round((now.getTime() - then) / 86_400_000))
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const days = daysBetween(iso, now)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.round(days / 30)}mo ago`
  return `${(days / 365).toFixed(1)}y ago`
}

export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`
}
