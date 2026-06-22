/**
 * Source reputation registry — ARCHITECTURE.md Appendix C.
 * Tier and weight drive confidence contributions. `is_official` (Tier 0) triggers
 * the official-filing boost.
 */
import type { Source } from "../types"

export type SourceKey =
  | "dart"
  | "krx"
  | "thebell"
  | "hankyung"
  | "mk"
  | "etnews"
  | "mt"
  | "edaily"
  | "zdnet"
  | "bloter"
  | "platum"
  | "venturesquare"
  | "outstanding"
  | "startuprecipe"
  | "aggregator"

export const SOURCES: Record<SourceKey, Source> = {
  dart: { id: "dart", domain: "dart.fss.or.kr", name: "DART 전자공시", tier: 0, weight: 1.0, is_official: true },
  krx: { id: "krx", domain: "kind.krx.co.kr", name: "KRX 공시", tier: 0, weight: 1.0, is_official: true },
  thebell: { id: "thebell", domain: "thebell.co.kr", name: "더벨", tier: 1, weight: 0.85, is_official: false },
  hankyung: { id: "hankyung", domain: "hankyung.com", name: "한국경제", tier: 1, weight: 0.85, is_official: false },
  mk: { id: "mk", domain: "mk.co.kr", name: "매일경제", tier: 1, weight: 0.85, is_official: false },
  etnews: { id: "etnews", domain: "etnews.com", name: "전자신문", tier: 1, weight: 0.85, is_official: false },
  mt: { id: "mt", domain: "mt.co.kr", name: "머니투데이", tier: 1, weight: 0.85, is_official: false },
  edaily: { id: "edaily", domain: "edaily.co.kr", name: "이데일리", tier: 1, weight: 0.8, is_official: false },
  zdnet: { id: "zdnet", domain: "zdnet.co.kr", name: "ZDNet Korea", tier: 1, weight: 0.8, is_official: false },
  bloter: { id: "bloter", domain: "bloter.net", name: "블로터", tier: 2, weight: 0.65, is_official: false },
  platum: { id: "platum", domain: "platum.kr", name: "플래텀", tier: 2, weight: 0.6, is_official: false },
  venturesquare: { id: "venturesquare", domain: "venturesquare.net", name: "벤처스퀘어", tier: 2, weight: 0.6, is_official: false },
  outstanding: { id: "outstanding", domain: "outstanding.kr", name: "아웃스탠딩", tier: 2, weight: 0.6, is_official: false },
  startuprecipe: { id: "startuprecipe", domain: "startuprecipe.co.kr", name: "스타트업레시피", tier: 2, weight: 0.55, is_official: false },
  aggregator: { id: "aggregator", domain: "news.aggregator.kr", name: "뉴스 아그리게이터", tier: 3, weight: 0.3, is_official: false },
}
