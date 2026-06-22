/**
 * Exemplar company seeds — the canonical patterns. These cover every event type,
 * the three deliberate source-conflict cases (furiosa valuation, toss valuation,
 * wrtn employee_count), valuation decay/history, and DART-anchored companies.
 *
 * Breadth companies live in seeds-extra.ts (EXTRA_SEEDS) and follow these patterns.
 * The full set is assembled in index.ts.
 */
import type { CompanySeed, WatchlistSeed } from "./schema"

export const EXEMPLAR_SEEDS: CompanySeed[] = [
  // ─────────────────────────── 1. FuriosaAI ────────────────────────────
  {
    id: "furiosa",
    dart: "01234567",
    ko: "퓨리오사AI",
    en: "FuriosaAI",
    aliases: ["퓨리오사", "Furiosa", "FuriosaAI Inc.", "퓨리오사에이아이"],
    sector: "AI Semiconductor",
    stage: "Series C",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2017,
    description:
      "데이터센터용 AI 추론 가속기(RNGD, Warboy)를 설계하는 팹리스. 메타·사우디 등과 협력 논의가 보도됨.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series C",
          amount_krw: 170_000_000_000,
          post_money_krw: 1_100_000_000_000,
          lead_investor: "DSC인베스트먼트",
          investors: ["DSC인베스트먼트", "KDB산업은행", "교보증권", "Crit Ventures"],
        },
        occurred_on: "2026-04-15",
        date_precision: "day",
        status: "announced",
        summary: "1,700억원 규모 시리즈 C 투자 유치",
        derivesFacts: true,
        assertions: [
          {
            src: "thebell",
            daysAgo: 68,
            title: "퓨리오사AI, 1700억 시리즈C 유치…기업가치 1.1조 평가",
            snippet: "AI 반도체 팹리스 퓨리오사AI가 시리즈C 라운드를 마무리했다.",
            quote: "1,700억원 규모의 시리즈C 투자를 유치했다",
          },
          {
            src: "hankyung",
            daysAgo: 68,
            title: "퓨리오사AI 1700억 조달…'1조 클럽' 진입",
            snippet: "퓨리오사AI가 시리즈C로 유니콘 반열에 올랐다.",
            quote: "포스트 밸류 약 1조1000억원을 인정받았다",
            cluster: "furiosa-seriesc-wire",
          },
          {
            src: "mk",
            daysAgo: 67,
            title: "퓨리오사AI, 시리즈C 1700억 유치",
            snippet: "산업은행 등이 참여했다.",
            quote: "1,700억원 규모 시리즈C",
            cluster: "furiosa-seriesc-wire",
          },
        ],
      },
      {
        type: "partnership",
        payload: {
          partner: "Meta",
          nature: "tech",
          description: "데이터센터 AI 추론 칩 공급 논의",
        },
        occurred_on: "2026-03-01",
        date_precision: "month",
        status: "rumored",
        summary: "메타와 AI 추론 칩 공급 협력 논의 (루머)",
        assertions: [
          {
            src: "etnews",
            daysAgo: 110,
            title: "퓨리오사AI, 메타와 AI칩 공급 논의설",
            snippet: "업계에 따르면 양사가 협력을 타진 중이다.",
            quote: "메타와 추론 칩 공급을 논의 중인 것으로 알려졌다",
            status: "rumored",
          },
        ],
      },
    ],
    facts: [
      {
        type: "valuation",
        unit: "krw",
        trueValue: 1_100_000_000_000,
        assertions: [
          // CURRENT generation — sources CONFLICT on post-money
          {
            src: "thebell",
            daysAgo: 68,
            value: 1_100_000_000_000,
            raw: "1조1000억원",
            quote: "포스트 밸류 약 1조1000억원",
            gen: 1,
          },
          {
            src: "hankyung",
            daysAgo: 66,
            value: 1_100_000_000_000,
            raw: "약 1.1조원",
            quote: "기업가치 1조1000억원으로 평가",
            gen: 1,
          },
          {
            src: "platum",
            daysAgo: 64,
            value: 800_000_000_000,
            raw: "8000억원대",
            quote: "기업가치가 8000억원대로 추산된다",
            quality: "inferred",
            gen: 1,
          },
          // PRIOR generation — Series B valuation (decayed, closed)
          {
            src: "thebell",
            daysAgo: 760,
            value: 480_000_000_000,
            raw: "4800억원",
            quote: "시리즈B 당시 기업가치 4800억원",
            asOf: "2024-06-01",
            gen: 0,
          },
        ],
      },
      {
        // Single inferred estimate that later proved low — a calibration miss.
        type: "employee_count",
        unit: "count",
        trueValue: 260,
        assertions: [
          {
            src: "hankyung",
            daysAgo: 70,
            value: 210,
            raw: "약 210명",
            quote: "임직원은 약 210명 규모",
            quality: "inferred",
          },
        ],
      },
      {
        type: "revenue",
        unit: "krw",
        trueValue: 22_000_000_000,
        assertions: [
          {
            src: "dart",
            daysAgo: 150,
            value: 22_000_000_000,
            raw: "220억원",
            quote: "2025년 매출 220억원",
            asOf: "2025-12-31",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 2. Viva Republica / Toss ────────────────
  {
    id: "toss",
    dart: "00876543",
    ko: "비바리퍼블리카",
    en: "Viva Republica",
    aliases: ["토스", "Toss", "비바리퍼블리카(주)", "Toss Inc."],
    sector: "Fintech",
    stage: "Pre-IPO",
    hqRegion: "Seoul",
    hq: "서울 강남구 테헤란로",
    founded: 2013,
    description:
      "간편송금에서 출발한 종합 금융 슈퍼앱 '토스' 운영사. 토스뱅크·토스증권·토스페이먼츠를 거느린 핀테크 그룹.",
    events: [
      {
        type: "ipo_announcement",
        payload: {
          exchange: "NASDAQ",
          target_date: "2026-Q4",
          underwriters: ["Goldman Sachs", "Morgan Stanley", "삼성증권"],
          market_cap_krw: 15_000_000_000_000,
        },
        occurred_on: "2026-05-20",
        date_precision: "day",
        status: "announced",
        summary: "나스닥 상장 추진 공식화 (목표 2026 4분기)",
        assertions: [
          {
            src: "mk",
            daysAgo: 33,
            title: "토스, 나스닥行 공식화…연내 IPO 목표",
            snippet: "비바리퍼블리카가 미국 증시 상장을 추진한다.",
            quote: "나스닥 상장을 목표로 주관사를 선정했다",
          },
          {
            src: "thebell",
            daysAgo: 33,
            title: "토스 美 상장 주관사에 골드만·모스",
            snippet: "대표 주관사 라인업이 확정됐다.",
            quote: "골드만삭스와 모건스탠리를 공동 주관사로",
            cluster: "toss-ipo-wire",
          },
        ],
      },
      {
        type: "funding_round",
        payload: {
          round_name: "Pre-IPO",
          amount_krw: 900_000_000_000,
          post_money_krw: 9_100_000_000_000,
          lead_investor: "Tonsus Capital",
          investors: ["Tonsus Capital", "KDB산업은행", "Aspex Management"],
        },
        occurred_on: "2024-09-01",
        date_precision: "month",
        status: "completed",
        summary: "9,000억원 규모 프리-IPO 투자 유치",
        derivesFacts: false,
        assertions: [
          {
            src: "thebell",
            daysAgo: 660,
            title: "토스, 9000억 프리IPO 마무리",
            snippet: "기업가치 9조원을 인정받았다.",
            quote: "약 9000억원 규모 프리IPO를 마무리",
          },
        ],
      },
    ],
    facts: [
      {
        type: "valuation",
        unit: "krw",
        trueValue: 12_000_000_000_000,
        assertions: [
          // CONFLICT: IPO target valuation cited differently
          {
            src: "mk",
            daysAgo: 33,
            value: 15_000_000_000_000,
            raw: "15조원",
            quote: "상장 후 기업가치 약 15조원을 기대",
            quality: "inferred",
            gen: 1,
          },
          {
            src: "thebell",
            daysAgo: 33,
            value: 12_000_000_000_000,
            raw: "12조원",
            quote: "시장에서는 12조원 안팎을 적정가로 본다",
            quality: "derived",
            gen: 1,
          },
          {
            src: "edaily",
            daysAgo: 30,
            value: 12_000_000_000_000,
            raw: "12조원대",
            quote: "12조원대 밸류에이션이 거론된다",
            quality: "inferred",
            gen: 1,
          },
          // prior: pre-IPO round valuation
          {
            src: "thebell",
            daysAgo: 660,
            value: 9_100_000_000_000,
            raw: "9.1조원",
            quote: "프리IPO 기업가치 약 9조1000억원",
            asOf: "2024-09-01",
            gen: 0,
          },
        ],
      },
      {
        type: "total_raised",
        unit: "krw",
        trueValue: 2_600_000_000_000,
        assertions: [
          {
            src: "thebell",
            daysAgo: 33,
            value: 2_600_000_000_000,
            raw: "약 2.6조원",
            quote: "창업 이후 누적 2조6000억원을 조달",
            quality: "derived",
          },
          {
            src: "hankyung",
            daysAgo: 40,
            value: 2_600_000_000_000,
            raw: "2조6000억",
            quote: "누적 투자유치 2조6000억원",
            quality: "derived",
            cluster: "toss-raised-wire",
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 2_300,
        assertions: [
          {
            src: "dart",
            daysAgo: 120,
            value: 2_300,
            raw: "2,300명",
            quote: "분기보고서 기준 임직원 2,300명",
            asOf: "2026-03-31",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 3. Kurly ────────────────────────────────
  {
    id: "kurly",
    dart: "01112233",
    ko: "컬리",
    en: "Kurly",
    aliases: ["마켓컬리", "Kurly", "컬리(주)", "Kurly Inc.", "더파머스"],
    sector: "E-commerce",
    stage: "Pre-IPO",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2014,
    description:
      "새벽배송 '마켓컬리'와 뷰티컬리를 운영하는 신선식품 커머스. 수년간 IPO를 추진해 왔다.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Pre-IPO",
          amount_krw: 120_000_000_000,
          post_money_krw: 2_900_000_000_000,
          lead_investor: "앵커에쿼티파트너스",
          investors: ["앵커에쿼티파트너스", "Aspex"],
        },
        occurred_on: "2025-11-10",
        date_precision: "day",
        status: "completed",
        summary: "1,200억원 프리-IPO 투자 유치 (다운라운드)",
        derivesFacts: false,
        assertions: [
          {
            src: "thebell",
            daysAgo: 224,
            title: "컬리, 1200억 프리IPO…눈높이 낮춘 2.9조",
            snippet: "컬리가 기업가치를 낮춰 자금을 조달했다.",
            quote: "기업가치 2조9000억원으로 1200억원을 조달",
          },
          {
            src: "mt",
            daysAgo: 223,
            title: "컬리 프리IPO 마무리…밸류 2.9조",
            snippet: "직전 4조원에서 눈높이를 낮췄다.",
            quote: "2조9000억원 규모로 평가",
            cluster: "kurly-preipo-wire",
          },
        ],
      },
      {
        type: "ipo_announcement",
        payload: {
          exchange: "KOSPI",
          target_date: "2026-Q4",
          underwriters: ["NH투자증권", "한국투자증권", "JP모건"],
        },
        occurred_on: "2026-02-15",
        date_precision: "day",
        status: "announced",
        summary: "유가증권시장(KOSPI) 상장 재추진",
        assertions: [
          {
            src: "hankyung",
            daysAgo: 127,
            title: "컬리, 코스피 상장 재도전",
            snippet: "컬리가 상장 예비심사를 다시 청구했다.",
            quote: "코스피 상장 예비심사를 청구했다",
          },
          {
            src: "krx",
            daysAgo: 126,
            title: "[공시] 컬리 코스피 상장예비심사신청서 접수",
            snippet: "한국거래소 접수 공시.",
            quote: "상장예비심사신청서를 접수했다",
          },
        ],
      },
    ],
    facts: [
      {
        type: "valuation",
        unit: "krw",
        trueValue: 2_900_000_000_000,
        assertions: [
          // current (down round)
          {
            src: "thebell",
            daysAgo: 224,
            value: 2_900_000_000_000,
            raw: "2.9조원",
            quote: "기업가치 2조9000억원",
            asOf: "2025-11-10",
            gen: 2,
          },
          {
            src: "mt",
            daysAgo: 223,
            value: 2_900_000_000_000,
            raw: "2조9000억",
            quote: "2조9000억원 규모로 평가",
            asOf: "2025-11-10",
            gen: 2,
            cluster: "kurly-val-wire",
          },
          // prior gen 1 — 4조 peak
          {
            src: "thebell",
            daysAgo: 900,
            value: 4_000_000_000_000,
            raw: "4조원",
            quote: "기업가치 4조원으로 평가",
            asOf: "2021-12-01",
            gen: 1,
          },
          // gen 0 — 2.5조 earlier
          {
            src: "mk",
            daysAgo: 1300,
            value: 2_500_000_000_000,
            raw: "2.5조원",
            quote: "기업가치 약 2조5000억원",
            asOf: "2021-07-01",
            gen: 0,
          },
        ],
      },
      {
        type: "revenue",
        unit: "krw",
        trueValue: 2_100_000_000_000,
        assertions: [
          {
            src: "dart",
            daysAgo: 110,
            value: 2_100_000_000_000,
            raw: "2조1000억원",
            quote: "2025년 연결 매출 2조1000억원",
            asOf: "2025-12-31",
          },
          {
            src: "hankyung",
            daysAgo: 108,
            value: 2_100_000_000_000,
            raw: "2.1조",
            quote: "매출 2조1000억원을 기록",
            cluster: "kurly-rev-wire",
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 1_700,
        assertions: [
          {
            src: "dart",
            daysAgo: 110,
            value: 1_700,
            raw: "1,700명",
            quote: "임직원 1,700명",
            asOf: "2025-12-31",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 4. VUNO ─────────────────────────────────
  {
    id: "vuno",
    dart: "00554477",
    ko: "뷰노",
    en: "VUNO",
    aliases: ["VUNO", "뷰노(주)", "VUNO Inc."],
    sector: "Healthcare AI",
    stage: "Public",
    hqRegion: "Seoul",
    hq: "서울 송파구",
    founded: 2014,
    description:
      "의료 AI 솔루션 기업. 심정지 예측 'VUNO Med-DeepCARS', 흉부 X-ray·안저 판독 AI를 상용화한 코스닥 상장사.",
    events: [
      {
        type: "ipo_completion",
        payload: {
          exchange: "KOSDAQ",
          offer_price_krw: 21_000,
          market_cap_krw: 300_000_000_000,
        },
        occurred_on: "2021-02-26",
        date_precision: "day",
        status: "completed",
        summary: "코스닥 기술특례 상장 완료",
        assertions: [
          {
            src: "krx",
            daysAgo: 1942,
            title: "[공시] 뷰노 코스닥 신규상장",
            snippet: "기술특례 상장.",
            quote: "공모가 21,000원으로 코스닥 신규상장",
          },
        ],
      },
      {
        type: "profitability_milestone",
        payload: {
          metric: "operating_profit",
          period: "2025-Q4",
          value_krw: 1_500_000_000,
          turned_positive: true,
        },
        occurred_on: "2026-02-10",
        date_precision: "day",
        status: "completed",
        summary: "2025년 4분기 첫 분기 흑자 전환",
        assertions: [
          {
            src: "dart",
            daysAgo: 132,
            title: "[공시] 뷰노 2025 사업보고서",
            snippet: "4분기 영업이익 흑자.",
            quote: "4분기 영업이익 15억원으로 흑자 전환",
          },
          {
            src: "etnews",
            daysAgo: 131,
            title: "뷰노, 분기 첫 흑자…의료AI 수익화 신호",
            snippet: "의료 AI 업계의 의미 있는 전환점.",
            quote: "창사 이래 첫 분기 흑자를 달성했다",
          },
        ],
      },
      {
        type: "partnership",
        payload: {
          partner: "GE HealthCare",
          nature: "distribution",
          description: "흉부 X-ray AI 글로벌 유통 제휴",
        },
        occurred_on: "2025-09-05",
        date_precision: "day",
        status: "announced",
        summary: "GE헬스케어와 글로벌 유통 제휴",
        assertions: [
          {
            src: "etnews",
            daysAgo: 290,
            title: "뷰노, GE헬스케어와 흉부AI 글로벌 협력",
            snippet: "해외 판로를 확대한다.",
            quote: "GE헬스케어와 글로벌 유통 계약을 체결했다",
          },
          {
            src: "zdnet",
            daysAgo: 290,
            title: "뷰노 흉부 AI, GE 채널 타고 글로벌로",
            snippet: "유통망 제휴.",
            quote: "GE헬스케어 채널을 통해 공급한다",
            cluster: "vuno-ge-wire",
          },
        ],
      },
    ],
    facts: [
      {
        type: "revenue",
        unit: "krw",
        trueValue: 35_000_000_000,
        assertions: [
          {
            src: "dart",
            daysAgo: 132,
            value: 35_000_000_000,
            raw: "350억원",
            quote: "2025년 매출 350억원",
            asOf: "2025-12-31",
            gen: 1,
          },
          {
            src: "dart",
            daysAgo: 500,
            value: 18_000_000_000,
            raw: "180억원",
            quote: "2024년 매출 180억원",
            asOf: "2024-12-31",
            gen: 0,
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 240,
        assertions: [
          {
            src: "dart",
            daysAgo: 132,
            value: 240,
            raw: "240명",
            quote: "임직원 240명",
            asOf: "2025-12-31",
          },
        ],
      },
      {
        type: "valuation",
        unit: "krw",
        trueValue: 520_000_000_000,
        assertions: [
          {
            src: "krx",
            daysAgo: 2,
            value: 520_000_000_000,
            raw: "시가총액 5200억원",
            quote: "종가 기준 시가총액 약 5200억원",
            quality: "derived",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 5. APR ──────────────────────────────────
  {
    id: "apr",
    dart: "00667788",
    ko: "에이피알",
    en: "APR Corp.",
    aliases: ["APR", "에이피알(주)", "메디큐브", "AGE-R"],
    sector: "Beauty Tech",
    stage: "Public",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2014,
    description:
      "뷰티 디바이스 '메디큐브 에이지알'과 화장품 브랜드를 운영하는 코스피 상장사. 미국·일본 등 해외 매출 비중이 높다.",
    events: [
      {
        type: "ipo_completion",
        payload: {
          exchange: "KOSPI",
          offer_price_krw: 250_000,
          market_cap_krw: 1_900_000_000_000,
        },
        occurred_on: "2024-02-27",
        date_precision: "day",
        status: "completed",
        summary: "코스피 상장 완료 (공모가 25만원)",
        assertions: [
          {
            src: "krx",
            daysAgo: 845,
            title: "[공시] 에이피알 유가증권시장 신규상장",
            snippet: "공모가 25만원.",
            quote: "공모가 250,000원으로 코스피 신규상장",
          },
          {
            src: "hankyung",
            daysAgo: 845,
            title: "APR 코스피 입성…올해 첫 대형 IPO",
            snippet: "수요예측 흥행.",
            quote: "공모가 25만원으로 상장했다",
            cluster: "apr-ipo-wire",
          },
        ],
      },
      {
        type: "profitability_milestone",
        payload: {
          metric: "operating_profit",
          period: "2025-FY",
          value_krw: 120_000_000_000,
          turned_positive: true,
        },
        occurred_on: "2026-02-12",
        date_precision: "day",
        status: "completed",
        summary: "2025년 영업이익 1,200억원 달성",
        assertions: [
          {
            src: "dart",
            daysAgo: 130,
            title: "[공시] 에이피알 2025 사업보고서",
            snippet: "영업이익 급증.",
            quote: "2025년 영업이익 1200억원",
          },
        ],
      },
    ],
    facts: [
      {
        type: "revenue",
        unit: "krw",
        trueValue: 850_000_000_000,
        assertions: [
          {
            src: "dart",
            daysAgo: 130,
            value: 850_000_000_000,
            raw: "8500억원",
            quote: "2025년 매출 8500억원",
            asOf: "2025-12-31",
            gen: 1,
          },
          {
            src: "dart",
            daysAgo: 495,
            value: 570_000_000_000,
            raw: "5700억원",
            quote: "2024년 매출 5700억원",
            asOf: "2024-12-31",
            gen: 0,
          },
        ],
      },
      {
        type: "valuation",
        unit: "krw",
        trueValue: 4_300_000_000_000,
        assertions: [
          {
            src: "krx",
            daysAgo: 2,
            value: 4_300_000_000_000,
            raw: "시총 4.3조원",
            quote: "종가 기준 시가총액 약 4조3000억원",
            quality: "derived",
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 600,
        assertions: [
          {
            src: "dart",
            daysAgo: 130,
            value: 600,
            raw: "600명",
            quote: "임직원 600명",
            asOf: "2025-12-31",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 6. Dalpha AI ────────────────────────────
  {
    id: "dalpha",
    dart: null,
    ko: "달파",
    en: "Dalpha AI",
    aliases: ["Dalpha", "달파", "Dalpha AI"],
    sector: "AI SaaS",
    stage: "Series A",
    hqRegion: "Seoul",
    hq: "서울 서초구",
    founded: 2021,
    description:
      "기업용 AI 에이전트·자동화 솔루션을 제공하는 스타트업. 비개발자도 AI 워크플로를 구축하도록 지원한다.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series A",
          amount_krw: 15_000_000_000,
          post_money_krw: 80_000_000_000,
          lead_investor: "한국투자파트너스",
          investors: ["한국투자파트너스", "스트롱벤처스", "본엔젤스"],
        },
        occurred_on: "2026-01-20",
        date_precision: "day",
        status: "completed",
        summary: "150억원 규모 시리즈 A 투자 유치",
        derivesFacts: true,
        assertions: [
          {
            src: "platum",
            daysAgo: 153,
            title: "달파, 150억 시리즈A 유치",
            snippet: "AI 에이전트 스타트업 달파가 투자를 유치했다.",
            quote: "150억원 규모 시리즈A 투자를 유치했다",
          },
          {
            src: "venturesquare",
            daysAgo: 152,
            title: "달파 시리즈A 150억 클로징",
            snippet: "한투파가 리드했다.",
            quote: "150억원 규모 시리즈A",
            cluster: "dalpha-a-wire",
          },
        ],
      },
      {
        type: "executive_hire",
        payload: {
          person: "김상엽",
          role: "CTO",
          direction: "join",
          effective_date: "2026-03-01",
        },
        occurred_on: "2026-03-01",
        date_precision: "day",
        status: "announced",
        summary: "신임 CTO 영입",
        assertions: [
          {
            src: "platum",
            daysAgo: 100,
            title: "달파, 전 네이버 출신 CTO 영입",
            snippet: "기술 리더십을 강화한다.",
            quote: "신임 최고기술책임자(CTO)로 김상엽 씨를 선임",
          },
        ],
      },
    ],
    facts: [
      {
        // Low-tier inferred headcount that drifted — calibration miss.
        type: "employee_count",
        unit: "count",
        trueValue: 62,
        assertions: [
          {
            src: "platum",
            daysAgo: 153,
            value: 45,
            raw: "45명",
            quote: "임직원 45명 규모",
            quality: "inferred",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 7. Wrtn Technologies ────────────────────
  {
    id: "wrtn",
    dart: null,
    ko: "뤼튼테크놀로지스",
    en: "Wrtn Technologies",
    aliases: ["뤼튼", "Wrtn", "뤼튼테크놀로지스(주)", "wrtn"],
    sector: "Generative AI",
    stage: "Series B",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2021,
    description:
      "생성형 AI 포털 '뤼튼'과 AI 캐릭터·검색 서비스를 운영. 국내 최대 규모의 B2C 생성형 AI 사용자 기반을 보유.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series B",
          amount_krw: 26_000_000_000,
          post_money_krw: 260_000_000_000,
          lead_investor: "BRV캐피탈",
          investors: ["BRV캐피탈", "캡스톤파트너스", "Z벤처캐피탈"],
        },
        occurred_on: "2025-08-12",
        date_precision: "day",
        status: "completed",
        summary: "260억원 규모 시리즈 B 투자 유치",
        derivesFacts: true,
        assertions: [
          {
            src: "thebell",
            daysAgo: 314,
            title: "뤼튼, 260억 시리즈B…밸류 2600억",
            snippet: "생성형 AI 스타트업 뤼튼이 후속 투자를 유치했다.",
            quote: "260억원 규모 시리즈B를 유치했다",
          },
          {
            src: "platum",
            daysAgo: 313,
            title: "뤼튼테크놀로지스 260억 시리즈B 클로징",
            snippet: "BRV가 리드.",
            quote: "260억원 규모 시리즈B",
            cluster: "wrtn-b-wire",
          },
        ],
      },
      {
        type: "executive_departure",
        payload: {
          person: "이세영",
          role: "CFO",
          direction: "leave",
          effective_date: "2026-04-01",
        },
        occurred_on: "2026-04-01",
        date_precision: "month",
        status: "announced",
        summary: "CFO 사임",
        assertions: [
          {
            src: "bloter",
            daysAgo: 70,
            title: "뤼튼 CFO 사임…재무라인 재편",
            snippet: "조직 개편의 일환.",
            quote: "최고재무책임자(CFO)가 일신상의 이유로 사임",
          },
        ],
      },
    ],
    facts: [
      {
        // CONFLICT + the weight-consensus (130) was actually wrong: true is 95.
        type: "employee_count",
        unit: "count",
        trueValue: 95,
        assertions: [
          // CONFLICT: sources disagree on headcount
          {
            src: "thebell",
            daysAgo: 60,
            value: 130,
            raw: "약 130명",
            quote: "임직원은 약 130명",
            quality: "inferred",
          },
          {
            src: "platum",
            daysAgo: 58,
            value: 95,
            raw: "95명",
            quote: "직원 수는 95명 수준",
            quality: "inferred",
          },
          {
            src: "aggregator",
            daysAgo: 40,
            value: 200,
            raw: "200여 명",
            quote: "200여 명이 근무 중",
            quality: "inferred",
          },
        ],
      },
      {
        type: "revenue",
        unit: "krw",
        trueValue: 9_000_000_000,
        assertions: [
          {
            src: "thebell",
            daysAgo: 314,
            value: 9_000_000_000,
            raw: "90억원",
            quote: "연 매출 약 90억원으로 추정",
            quality: "inferred",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 8. Mathpresso / QANDA ───────────────────
  {
    id: "mathpresso",
    dart: "00991122",
    ko: "매스프레소",
    en: "Mathpresso",
    aliases: ["콴다", "QANDA", "매스프레소(주)", "Mathpresso"],
    sector: "Edutech",
    stage: "Series C",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2015,
    description:
      "AI 학습 플랫폼 '콴다(QANDA)' 운영사. 사진 한 장으로 수학 문제 풀이를 제공하며 동남아·일본에서 대규모 사용자를 확보.",
    events: [
      {
        type: "acquisition",
        payload: {
          acquirer: "매스프레소",
          target: "노바에듀",
          stake_pct: 100,
          amount_krw: 12_000_000_000,
        },
        occurred_on: "2025-12-03",
        date_precision: "day",
        status: "completed",
        summary: "에듀테크 스타트업 노바에듀 인수",
        assertions: [
          {
            src: "mt",
            daysAgo: 201,
            title: "매스프레소, 노바에듀 120억에 인수",
            snippet: "콴다 운영사가 인수합병에 나섰다.",
            quote: "노바에듀 지분 100%를 120억원에 인수",
          },
        ],
      },
      {
        type: "funding_round",
        payload: {
          round_name: "Series C",
          amount_krw: 100_000_000_000,
          post_money_krw: 850_000_000_000,
          lead_investor: "GGV Capital",
          investors: ["GGV Capital", "Goodwater Capital", "산은캐피탈"],
        },
        occurred_on: "2025-06-30",
        date_precision: "day",
        status: "completed",
        summary: "1,000억원 규모 시리즈 C 투자 유치",
        derivesFacts: true,
        assertions: [
          {
            src: "thebell",
            daysAgo: 357,
            title: "매스프레소, 1000억 시리즈C…밸류 8500억",
            snippet: "글로벌 VC가 참여했다.",
            quote: "1000억원 규모 시리즈C를 유치했다",
          },
          {
            src: "edaily",
            daysAgo: 356,
            title: "콴다 운영사 매스프레소 1000억 조달",
            snippet: "기업가치 8500억원.",
            quote: "기업가치 8500억원으로 평가",
            cluster: "math-c-wire",
          },
        ],
      },
    ],
    facts: [
      {
        type: "total_raised",
        unit: "krw",
        trueValue: 230_000_000_000,
        assertions: [
          {
            src: "thebell",
            daysAgo: 357,
            value: 230_000_000_000,
            raw: "약 2300억원",
            quote: "누적 투자유치 약 2300억원",
            quality: "derived",
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 300,
        assertions: [
          {
            src: "platum",
            daysAgo: 357,
            value: 320,
            raw: "약 320명",
            quote: "임직원 약 320명",
            quality: "inferred",
          },
        ],
      },
    ],
  },
]

export const WATCHLIST_SEEDS: WatchlistSeed[] = [
  {
    id: "wl-ai",
    name: "AI 반도체 & 인프라",
    company_ids: ["furiosa", "dalpha", "wrtn"],
    daysAgo: 90,
  },
  {
    id: "wl-fintech-ipo",
    name: "Pre-IPO 워치",
    company_ids: ["toss", "kurly", "mathpresso"],
    daysAgo: 45,
  },
  {
    id: "wl-public",
    name: "상장 추적",
    company_ids: ["vuno", "apr"],
    daysAgo: 20,
  },
]
