"use client"

import { ExternalLink, Quote } from "lucide-react"
import { cn, formatDate, relativeTime } from "@/lib/utils"
import type {
  EventAssertion,
  FactAssertion,
  ProvenanceBundle,
} from "@/lib/types"
import { SourceTierBadge } from "@/components/source-badge"
import { Badge } from "@/components/ui/badge"

type AnyAssertion = FactAssertion | EventAssertion

function isFactAssertion(a: AnyAssertion): a is FactAssertion {
  return (a as FactAssertion).fact_type !== undefined
}

/** One assertion = one source card. Snippet + title + deep-link only. */
export function AssertionCard({
  assertion,
  bundle,
  dissent,
}: {
  assertion: AnyAssertion
  bundle: ProvenanceBundle
  dissent?: boolean
}) {
  const article = bundle.articles[assertion.article_id]
  const source = article ? bundle.sources[article.source_id] : undefined
  if (!article || !source) return null

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3",
        dissent && "border-warning/40"
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <SourceTierBadge tier={source.tier} official={source.is_official} />
          <span className="truncate text-xs font-medium">{source.name}</span>
        </div>
        <span className="shrink-0 text-2xs text-muted-foreground tnum">
          {formatDate(article.published_at)} · {relativeTime(article.published_at)}
        </span>
      </div>

      <a
        href={article.url}
        target="_blank"
        rel="noreferrer"
        className="group flex items-start gap-1 text-sm font-medium hover:text-primary"
      >
        <span className="leading-snug">{article.title}</span>
        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
      </a>

      <p className="mt-1 text-xs text-muted-foreground">{article.snippet}</p>

      {/* Evidence quote — the grounded span the extraction asserted on */}
      <div className="mt-2 flex gap-1.5 rounded-md bg-muted/60 px-2.5 py-1.5">
        <Quote className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
        <p className="text-xs italic">“{assertion.evidence_quote}”</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
        <Badge variant="muted" className="font-mono">
          {assertion.model_name}
        </Badge>
        <Badge variant="muted" className="font-mono">
          prompt {assertion.prompt_version}
        </Badge>
        {isFactAssertion(assertion) ? (
          <Badge variant="muted" className="font-mono">
            q={assertion.extraction_quality.toFixed(2)}
          </Badge>
        ) : (
          <Badge variant="muted" className="font-mono">
            {assertion.event_status}
          </Badge>
        )}
      </div>
    </div>
  )
}

export function ProvenanceList({
  bundle,
  className,
}: {
  bundle: ProvenanceBundle
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {bundle.assertions.map((a) => (
        <AssertionCard key={a.id} assertion={a} bundle={bundle} />
      ))}
    </div>
  )
}

/**
 * Side-by-side conflict comparison: group fact assertions by their claimed value
 * so an analyst sees each source's number next to its tier. Used when has_conflict.
 */
export function ConflictComparison({ bundle }: { bundle: ProvenanceBundle }) {
  const factAssertions = bundle.assertions.filter(isFactAssertion)
  // group by raw_value label
  const groups = new Map<string, FactAssertion[]>()
  for (const a of factAssertions) {
    const key = a.value_numeric != null ? String(a.value_numeric) : a.value_text ?? "—"
    const arr = groups.get(key) ?? []
    arr.push(a)
    groups.set(key, arr)
  }
  const entries = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)

  return (
    <div className={cn("grid gap-3", entries.length >= 2 && "md:grid-cols-2")}>
      {entries.map(([key, group], i) => {
        const topWeight = i === 0
        return (
          <div
            key={key}
            className={cn(
              "rounded-lg border p-3",
              topWeight ? "border-primary/40 bg-primary/5" : "border-warning/40"
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">{group[0].raw_value}</div>
              <Badge variant={topWeight ? "default" : "warning"}>
                {topWeight ? "consensus" : "dissent"} · {group.length} src
              </Badge>
            </div>
            <div className="space-y-2">
              {group.map((a) => (
                <AssertionCard
                  key={a.id}
                  assertion={a}
                  bundle={bundle}
                  dissent={!topWeight}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
