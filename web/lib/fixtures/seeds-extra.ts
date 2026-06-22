/**
 * Breadth company seeds — extends EXEMPLAR_SEEDS for the 25–30 company target.
 * Follow the exact patterns in seeds.ts. Keep snippets short (no full article body).
 */
import type { CompanySeed } from "./schema"

export const EXTRA_SEEDS: CompanySeed[] = [
  // ─────────────────────────── 9. Dunamu (Upbit) ───────────────────────
  {
    id: "dunamu",
    dart: "02387457",
    ko: "두나무",
    en: "Dunamu",
    aliases: ["업비트", "Upbit", "두나무(주)", "Dunamu Inc."],
    sector: "Crypto Exchange",
    stage: "Pre-IPO",
    hqRegion: "Seoul",
    hq: "서울 강남구 테헤란로",
    founded: 2012,
    description:
      "국내 최대 암호화폐 거래소 '업비트'를 운영하는 핀테크 기업. 증권사 출신 임원진이 창업했으며 카카오와 협력 관계를 유지하고 있다.",
    events: [
      {
        type: "profitability_milestone",
        payload: {
          metric: "operating_profit",
          period: "2025-FY",
          value_krw: 1_800_000_000_000,
          turned_positive: false,
        },
        occurred_on: "2026-02-28",
        date_precision: "day",
        status: "completed",
        summary: "2025년 영업이익 1조8000억원 달성",
        assertions: [
          {
            src: "dart",
            daysAgo: 114,
            title: "[공시] 두나무 2025 사업보고서",
            snippet: "영업이익 1조8000억원.",
            quote: "2025년 영업이익 1조8000억원",
          },
          {
            src: "hankyung",
            daysAgo: 113,
            title: "두나무 작년 영업익 1.8조…코인 불장 수혜",
            snippet: "암호화폐 거래량 급증이 실적을 끌어올렸다.",
            quote: "영업이익 1조8000억원을 기록했다",
            cluster: "dunamu-profit-wire",
          },
        ],
      },
      {
        type: "ipo_announcement",
        payload: {
          exchange: "KOSPI",
          target_date: "2027-Q1",
          underwriters: ["한국투자증권", "KB증권"],
          market_cap_krw: 12_000_000_000_000,
        },
        occurred_on: "2026-04-10",
        date_precision: "month",
        status: "announced",
        summary: "코스피 상장 추진 논의 공개",
        assertions: [
          {
            src: "thebell",
            daysAgo: 73,
            title: "두나무, 코스피 상장 재추진 시동",
            snippet: "주관사 선정에 착수했다.",
            quote: "2027년 상반기 코스피 상장을 목표로 주관사를 검토 중",
          },
        ],
      },
    ],
    facts: [
      {
        type: "revenue",
        unit: "krw",
        trueValue: 3_200_000_000_000,
        assertions: [
          {
            src: "dart",
            daysAgo: 114,
            value: 3_200_000_000_000,
            raw: "3조2000억원",
            quote: "2025년 매출 3조2000억원",
            asOf: "2025-12-31",
            gen: 1,
          },
          {
            src: "dart",
            daysAgo: 480,
            value: 870_000_000_000,
            raw: "8700억원",
            quote: "2024년 매출 8700억원",
            asOf: "2024-12-31",
            gen: 0,
          },
        ],
      },
      {
        type: "valuation",
        unit: "krw",
        trueValue: 12_000_000_000_000,
        assertions: [
          {
            src: "thebell",
            daysAgo: 73,
            value: 12_000_000_000_000,
            raw: "12조원",
            quote: "예상 시가총액 12조원",
            quality: "derived",
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 950,
        assertions: [
          {
            src: "dart",
            daysAgo: 114,
            value: 950,
            raw: "950명",
            quote: "임직원 950명",
            asOf: "2025-12-31",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 10. 야놀자 (Yanolja) ────────────────────
  {
    id: "yanolja",
    dart: "01654321",
    ko: "야놀자",
    en: "Yanolja",
    aliases: ["야놀자(주)", "Yanolja Co., Ltd.", "yanolja"],
    sector: "Travel Tech",
    stage: "Pre-IPO",
    hqRegion: "Seoul",
    hq: "서울 마포구",
    founded: 2005,
    description:
      "숙박·여가 예약 플랫폼 '야놀자'와 글로벌 호텔 SaaS 'IDS Next'를 운영하는 여행 테크 기업. 소프트뱅크 비전펀드 투자사.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series F",
          amount_krw: 2_000_000_000_000,
          post_money_krw: 10_000_000_000_000,
          lead_investor: "SoftBank Vision Fund 2",
          investors: ["SoftBank Vision Fund 2"],
        },
        occurred_on: "2021-07-15",
        date_precision: "day",
        status: "completed",
        summary: "소프트뱅크 2조원 투자 유치 (기업가치 10조원)",
        derivesFacts: false,
        assertions: [
          {
            src: "mk",
            daysAgo: 1803,
            title: "야놀자, 소프트뱅크서 2조 유치…기업가치 10조",
            snippet: "국내 여행 플랫폼 사상 최대 투자.",
            quote: "소프트뱅크 비전펀드2로부터 2조원을 유치했다",
          },
        ],
      },
      {
        type: "acquisition",
        payload: {
          acquirer: "야놀자",
          target: "IDS Next",
          stake_pct: 100,
          amount_krw: 280_000_000_000,
        },
        occurred_on: "2023-03-20",
        date_precision: "day",
        status: "completed",
        summary: "글로벌 호텔 SaaS 기업 IDS Next 인수",
        assertions: [
          {
            src: "etnews",
            daysAgo: 1189,
            title: "야놀자, IDS Next 2800억에 인수",
            snippet: "글로벌 B2B 시장 확대 전략.",
            quote: "IDS Next를 약 2800억원에 인수했다",
          },
          {
            src: "zdnet",
            daysAgo: 1188,
            title: "야놀자 IDS Next 인수…글로벌 SaaS 박차",
            snippet: "인도 기반 호텔 IT 솔루션 업체.",
            quote: "IDS Next 지분 100%를 확보했다",
            cluster: "yanolja-ids-wire",
          },
        ],
      },
    ],
    facts: [
      {
        type: "valuation",
        unit: "krw",
        trueValue: 10_000_000_000_000,
        assertions: [
          {
            src: "mk",
            daysAgo: 1803,
            value: 10_000_000_000_000,
            raw: "10조원",
            quote: "기업가치 10조원을 인정받았다",
            asOf: "2021-07-15",
            gen: 1,
          },
          {
            src: "thebell",
            daysAgo: 2100,
            value: 3_000_000_000_000,
            raw: "3조원",
            quote: "시리즈E 당시 기업가치 3조원",
            asOf: "2020-10-01",
            gen: 0,
          },
        ],
      },
      {
        type: "total_raised",
        unit: "krw",
        trueValue: 2_800_000_000_000,
        assertions: [
          {
            src: "thebell",
            daysAgo: 300,
            value: 2_800_000_000_000,
            raw: "약 2조8000억원",
            quote: "누적 투자유치 약 2조8000억원",
            quality: "derived",
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 2_500,
        assertions: [
          {
            src: "dart",
            daysAgo: 130,
            value: 2_500,
            raw: "2,500명",
            quote: "임직원 2,500명",
            asOf: "2025-12-31",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 11. 당근 (Daangn) ───────────────────────
  {
    id: "daangn",
    dart: null,
    ko: "당근",
    en: "Daangn",
    aliases: ["당근마켓", "Daangn Market", "당근(주)", "Karrot"],
    sector: "Community Commerce",
    stage: "Series D",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2015,
    description:
      "지역 기반 중고거래·동네 커뮤니티 플랫폼 '당근마켓' 운영사. 월간활성사용자 2,000만 명 이상으로 국내 생활 플랫폼 1위.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series D",
          amount_krw: 400_000_000_000,
          post_money_krw: 3_000_000_000_000,
          lead_investor: "DST Global",
          investors: ["DST Global", "Goodwater Capital", "알토스벤처스"],
        },
        occurred_on: "2021-08-24",
        date_precision: "day",
        status: "completed",
        summary: "4,000억원 규모 시리즈 D 유치 (기업가치 3조원)",
        derivesFacts: false,
        assertions: [
          {
            src: "hankyung",
            daysAgo: 1763,
            title: "당근마켓, 4000억 시리즈D…기업가치 3조",
            snippet: "DST글로벌이 리드했다.",
            quote: "4000억원 규모 시리즈D를 유치했다",
          },
        ],
      },
      {
        type: "partnership",
        payload: {
          partner: "카카오페이",
          nature: "financial",
          description: "당근페이 결제 인프라 연동 파트너십",
        },
        occurred_on: "2025-10-15",
        date_precision: "day",
        status: "announced",
        summary: "카카오페이와 결제 인프라 파트너십 체결",
        assertions: [
          {
            src: "mt",
            daysAgo: 250,
            title: "당근, 카카오페이와 결제 제휴",
            snippet: "당근페이 이용 편의 향상을 기대한다.",
            quote: "카카오페이 인프라를 활용한 결제 서비스를 연동한다",
          },
          {
            src: "bloter",
            daysAgo: 249,
            title: "당근마켓 × 카카오페이 결제 연동",
            snippet: "간편결제 생태계 협력.",
            quote: "카카오페이와 결제 파트너십을 맺었다",
            cluster: "daangn-pay-wire",
          },
        ],
      },
    ],
    facts: [
      {
        type: "valuation",
        unit: "krw",
        trueValue: 3_000_000_000_000,
        assertions: [
          {
            src: "hankyung",
            daysAgo: 1763,
            value: 3_000_000_000_000,
            raw: "3조원",
            quote: "기업가치 3조원",
            asOf: "2021-08-24",
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 600,
        assertions: [
          // deliberate conflict — aggregator over-reports headcount
          {
            src: "platum",
            daysAgo: 150,
            value: 600,
            raw: "약 600명",
            quote: "임직원 약 600명",
            quality: "inferred",
          },
          {
            src: "aggregator",
            daysAgo: 90,
            value: 750,
            raw: "750여 명",
            quote: "750여 명이 재직 중인 것으로 알려졌다",
            quality: "inferred",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 12. 무신사 (Musinsa) ────────────────────
  {
    id: "musinsa",
    dart: "01876543",
    ko: "무신사",
    en: "Musinsa",
    aliases: ["무신사(주)", "Musinsa Co.", "29CM", "스타일쉐어"],
    sector: "Fashion Commerce",
    stage: "Pre-IPO",
    hqRegion: "Seoul",
    hq: "서울 성동구",
    founded: 2009,
    description:
      "국내 최대 온라인 패션 플랫폼 '무신사 스토어'와 '29CM'을 운영하는 패션 커머스 그룹. 글로벌 시장 확대를 추진 중이다.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series C",
          amount_krw: 300_000_000_000,
          post_money_krw: 2_800_000_000_000,
          lead_investor: "세콰이아 차이나",
          investors: ["세콰이아 차이나", "IMM인베스트먼트"],
        },
        occurred_on: "2022-01-17",
        date_precision: "day",
        status: "completed",
        summary: "3,000억원 시리즈 C 유치 (기업가치 2.8조원)",
        derivesFacts: false,
        assertions: [
          {
            src: "thebell",
            daysAgo: 1617,
            title: "무신사, 3000억 시리즈C…밸류 2.8조",
            snippet: "세콰이아가 리드.",
            quote: "3000억원 규모 시리즈C를 마무리했다",
          },
        ],
      },
      {
        type: "ipo_announcement",
        payload: {
          exchange: "KOSPI",
          target_date: "2027-H1",
          underwriters: ["미래에셋증권", "한국투자증권"],
        },
        occurred_on: "2026-03-20",
        date_precision: "month",
        status: "announced",
        summary: "코스피 상장 목표 2027년 상반기",
        assertions: [
          {
            src: "hankyung",
            daysAgo: 94,
            title: "무신사, 2027년 코스피 상장 추진",
            snippet: "패션 커머스 1위 기업의 IPO 도전.",
            quote: "2027년 상반기 코스피 상장을 목표로 주관사를 선정했다",
          },
          {
            src: "edaily",
            daysAgo: 93,
            title: "무신사 IPO 본격화…미래에셋 주관",
            snippet: "패션 플랫폼 최초 대형 상장 기대.",
            quote: "미래에셋증권을 대표주관사로 선정했다",
            cluster: "musinsa-ipo-wire",
          },
        ],
      },
    ],
    facts: [
      {
        type: "revenue",
        unit: "krw",
        trueValue: 1_200_000_000_000,
        assertions: [
          {
            src: "dart",
            daysAgo: 120,
            value: 1_200_000_000_000,
            raw: "1조2000억원",
            quote: "2025년 연결 매출 1조2000억원",
            asOf: "2025-12-31",
            gen: 1,
          },
          {
            src: "dart",
            daysAgo: 485,
            value: 950_000_000_000,
            raw: "9500억원",
            quote: "2024년 매출 9500억원",
            asOf: "2024-12-31",
            gen: 0,
          },
        ],
      },
      {
        type: "valuation",
        unit: "krw",
        trueValue: 3_500_000_000_000,
        assertions: [
          {
            src: "thebell",
            daysAgo: 94,
            value: 3_500_000_000_000,
            raw: "3.5조원",
            quote: "상장 후 기업가치 3조5000억원 이상 기대",
            quality: "inferred",
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 1_100,
        assertions: [
          {
            src: "dart",
            daysAgo: 120,
            value: 1_100,
            raw: "1,100명",
            quote: "임직원 1,100명",
            asOf: "2025-12-31",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 13. 직방 (Zigbang) ──────────────────────
  {
    id: "zigbang",
    dart: null,
    ko: "직방",
    en: "Zigbang",
    aliases: ["직방(주)", "Zigbang Inc.", "스테이션3"],
    sector: "PropTech",
    stage: "Series E+",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2010,
    description:
      "국내 1위 부동산 정보 앱 '직방'과 스마트홈 플랫폼을 운영하는 프롭테크 기업. 삼성SDS 스마트홈 사업부를 인수해 규모를 키웠다.",
    events: [
      {
        type: "acquisition",
        payload: {
          acquirer: "직방",
          target: "삼성SDS 스마트홈사업부",
          stake_pct: 100,
          amount_krw: 190_000_000_000,
        },
        occurred_on: "2022-11-01",
        date_precision: "month",
        status: "completed",
        summary: "삼성SDS 스마트홈 사업부 인수 완료",
        assertions: [
          {
            src: "etnews",
            daysAgo: 1329,
            title: "직방, 삼성SDS 스마트홈 1900억에 인수",
            snippet: "프롭테크와 스마트홈의 결합.",
            quote: "삼성SDS 스마트홈사업부를 약 1900억원에 인수 완료했다",
          },
        ],
      },
      {
        type: "funding_round",
        payload: {
          round_name: "Series E",
          amount_krw: 250_000_000_000,
          post_money_krw: 2_700_000_000_000,
          lead_investor: "알토스벤처스",
          investors: ["알토스벤처스", "소프트뱅크벤처스", "GS칼텍스"],
        },
        occurred_on: "2021-05-10",
        date_precision: "day",
        status: "completed",
        summary: "2,500억원 시리즈 E 유치 (기업가치 2.7조원)",
        derivesFacts: false,
        assertions: [
          {
            src: "mk",
            daysAgo: 1869,
            title: "직방, 2500억 시리즈E 유치…기업가치 2.7조",
            snippet: "알토스가 리드.",
            quote: "2500억원 규모 시리즈E를 완료했다",
          },
        ],
      },
    ],
    facts: [
      {
        type: "valuation",
        unit: "krw",
        trueValue: 2_700_000_000_000,
        assertions: [
          {
            src: "mk",
            daysAgo: 1869,
            value: 2_700_000_000_000,
            raw: "2조7000억원",
            quote: "기업가치 2조7000억원",
            asOf: "2021-05-10",
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 700,
        assertions: [
          {
            src: "platum",
            daysAgo: 200,
            value: 700,
            raw: "약 700명",
            quote: "직방 임직원 약 700명 규모",
            quality: "inferred",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 14. 오늘의집 (버킷플레이스) ──────────────
  {
    id: "ohouse",
    dart: null,
    ko: "버킷플레이스",
    en: "Bucketplace",
    aliases: ["오늘의집", "Ohouse", "버킷플레이스(주)", "Bucketplace Inc."],
    sector: "Home & Living Commerce",
    stage: "Series D",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2014,
    description:
      "인테리어 커뮤니티·이커머스 플랫폼 '오늘의집' 운영사. 가구·소품·인테리어 시공을 하나의 앱에서 연결하는 라이프스타일 플랫폼.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series D",
          amount_krw: 200_000_000_000,
          post_money_krw: 2_000_000_000_000,
          lead_investor: "이케아 그룹 투자펀드",
          investors: ["이케아 그룹 투자펀드", "알토스벤처스", "소프트뱅크벤처스"],
        },
        occurred_on: "2022-06-08",
        date_precision: "day",
        status: "completed",
        summary: "이케아 그룹 투자 포함 2,000억원 시리즈 D 유치",
        derivesFacts: false,
        assertions: [
          {
            src: "thebell",
            daysAgo: 1479,
            title: "오늘의집, 이케아 그룹 투자 등 2000억 유치",
            snippet: "기업가치 2조원으로 유니콘 등극.",
            quote: "2000억원 규모 시리즈D를 유치했다",
          },
        ],
      },
      {
        type: "executive_hire",
        payload: {
          person: "허지유",
          role: "CFO",
          direction: "join",
          effective_date: "2026-02-01",
        },
        occurred_on: "2026-02-01",
        date_precision: "day",
        status: "announced",
        summary: "신임 CFO 영입 — IPO 준비 강화",
        assertions: [
          {
            src: "outstanding",
            daysAgo: 141,
            title: "오늘의집, 전 카카오 재무담당 CFO 영입",
            snippet: "IPO를 위한 재무 리더십 강화.",
            quote: "신임 최고재무책임자(CFO)로 허지유 씨를 선임했다",
          },
        ],
      },
    ],
    facts: [
      {
        type: "valuation",
        unit: "krw",
        trueValue: 2_000_000_000_000,
        assertions: [
          {
            src: "thebell",
            daysAgo: 1479,
            value: 2_000_000_000_000,
            raw: "2조원",
            quote: "기업가치 2조원으로 유니콘 반열에 올랐다",
            asOf: "2022-06-08",
          },
        ],
      },
      {
        type: "revenue",
        unit: "krw",
        trueValue: 600_000_000_000,
        assertions: [
          {
            src: "thebell",
            daysAgo: 120,
            value: 600_000_000_000,
            raw: "약 6000억원",
            quote: "2025년 매출 약 6000억원으로 추정",
            quality: "inferred",
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 550,
        assertions: [
          {
            src: "startuprecipe",
            daysAgo: 180,
            value: 550,
            raw: "550명",
            quote: "오늘의집 임직원 550명",
            quality: "inferred",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 15. 리벨리온 (Rebellions) ──────────────
  {
    id: "rebellions",
    dart: null,
    ko: "리벨리온",
    en: "Rebellions",
    aliases: ["Rebellions Inc.", "리벨리온(주)"],
    sector: "AI Semiconductor",
    stage: "Series C",
    hqRegion: "Seoul",
    hq: "서울 서초구",
    founded: 2020,
    description:
      "데이터센터·엣지용 NPU 'ATOM'과 'REBEL'을 개발하는 AI 반도체 팹리스. 사피온과 합병으로 규모를 키웠다.",
    events: [
      {
        type: "merger",
        payload: {
          entity_a: "리벨리온",
          entity_b: "사피온",
          surviving_entity: "리벨리온",
        },
        occurred_on: "2024-09-30",
        date_precision: "month",
        status: "completed",
        summary: "사피온과 합병 완료 — AI 반도체 통합법인 출범",
        assertions: [
          {
            src: "etnews",
            daysAgo: 630,
            title: "리벨리온·사피온 합병 완료…국내 1위 AI칩 법인",
            snippet: "두 팹리스가 하나로 합쳐졌다.",
            quote: "리벨리온과 사피온이 합병하여 통합법인이 출범했다",
          },
          {
            src: "zdnet",
            daysAgo: 630,
            title: "리벨리온+사피온, 합병 마무리",
            snippet: "통합 자본금 규모 확대.",
            quote: "합병 완료로 자본금 규모를 키웠다",
            cluster: "rebellions-merger-wire",
          },
        ],
      },
      {
        type: "funding_round",
        payload: {
          round_name: "Series C",
          amount_krw: 200_000_000_000,
          post_money_krw: 1_500_000_000_000,
          lead_investor: "KT",
          investors: ["KT", "한화시스템", "STIC인베스트먼트"],
        },
        occurred_on: "2025-03-18",
        date_precision: "day",
        status: "completed",
        summary: "2,000억원 규모 시리즈 C 투자 유치",
        derivesFacts: true,
        assertions: [
          {
            src: "thebell",
            daysAgo: 461,
            title: "리벨리온, 2000억 시리즈C…밸류 1.5조",
            snippet: "KT가 전략적 투자자로 참여했다.",
            quote: "2000억원 규모 시리즈C를 유치했다",
          },
          {
            src: "hankyung",
            daysAgo: 460,
            title: "리벨리온 2000억 조달, 기업가치 1.5조",
            snippet: "AI칩 팹리스 강자로 부상.",
            quote: "기업가치 1조5000억원을 인정받았다",
            cluster: "rebellions-c-wire",
          },
        ],
      },
    ],
    facts: [
      {
        type: "valuation",
        unit: "krw",
        trueValue: 1_500_000_000_000,
        assertions: [
          {
            src: "thebell",
            daysAgo: 461,
            value: 1_500_000_000_000,
            raw: "1.5조원",
            quote: "기업가치 1조5000억원",
            gen: 1,
          },
          {
            src: "thebell",
            daysAgo: 900,
            value: 500_000_000_000,
            raw: "5000억원",
            quote: "시리즈B 당시 기업가치 약 5000억원",
            asOf: "2023-06-01",
            gen: 0,
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 350,
        assertions: [
          {
            src: "etnews",
            daysAgo: 461,
            value: 350,
            raw: "350명",
            quote: "합병 후 임직원 약 350명",
            quality: "inferred",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 16. 뤼이드 (Riiid) ─────────────────────
  {
    id: "riiid",
    dart: "02134567",
    ko: "뤼이드",
    en: "Riiid",
    aliases: ["Riiid Inc.", "뤼이드(주)", "산타토익", "Santa TOEIC"],
    sector: "Edutech",
    stage: "Series D",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2014,
    description:
      "AI 기반 영어 학습 앱 '산타토익'으로 세계적 인지도를 얻은 에듀테크 기업. 일본·미국 등 글로벌 시장을 공략 중이다.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series D",
          amount_krw: 183_000_000_000,
          post_money_krw: 1_100_000_000_000,
          lead_investor: "SoftBank Vision Fund 2",
          investors: ["SoftBank Vision Fund 2"],
        },
        occurred_on: "2021-01-28",
        date_precision: "day",
        status: "completed",
        summary: "1,830억원 시리즈 D 유치 (기업가치 1.1조원)",
        derivesFacts: false,
        assertions: [
          {
            src: "mk",
            daysAgo: 1972,
            title: "뤼이드, 소프트뱅크서 1830억 유치",
            snippet: "AI 교육 스타트업 유니콘 등극.",
            quote: "소프트뱅크 비전펀드2로부터 1830억원을 유치했다",
          },
        ],
      },
      {
        type: "executive_departure",
        payload: {
          person: "장영준",
          role: "COO",
          direction: "leave",
          effective_date: "2025-09-01",
        },
        occurred_on: "2025-09-01",
        date_precision: "month",
        status: "announced",
        summary: "공동창업자 COO 퇴임",
        assertions: [
          {
            src: "bloter",
            daysAgo: 294,
            title: "뤼이드 공동창업자 장영준 COO 퇴임",
            snippet: "경영진 재편 신호.",
            quote: "공동창업자이자 COO인 장영준 씨가 회사를 떠났다",
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
          {
            src: "mk",
            daysAgo: 1972,
            value: 1_100_000_000_000,
            raw: "1.1조원",
            quote: "기업가치 약 1조1000억원",
            asOf: "2021-01-28",
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 180,
        assertions: [
          {
            src: "platum",
            daysAgo: 180,
            value: 180,
            raw: "약 180명",
            quote: "임직원 약 180명",
            quality: "inferred",
          },
        ],
      },
      {
        type: "revenue",
        unit: "krw",
        trueValue: 55_000_000_000,
        assertions: [
          {
            src: "dart",
            daysAgo: 135,
            value: 55_000_000_000,
            raw: "550억원",
            quote: "2025년 매출 550억원",
            asOf: "2025-12-31",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 17. 업스테이지 (Upstage) ───────────────
  {
    id: "upstage",
    dart: null,
    ko: "업스테이지",
    en: "Upstage",
    aliases: ["Upstage AI", "업스테이지(주)", "Upstage Inc."],
    sector: "Enterprise AI",
    stage: "Series B",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2020,
    description:
      "LLM 기반 기업용 AI 솔루션 'AskUp'과 OCR·문서 AI를 제공하는 엔터프라이즈 AI 스타트업. 전 카카오 AI 핵심 연구진이 창업.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series B",
          amount_krw: 100_000_000_000,
          post_money_krw: 620_000_000_000,
          lead_investor: "LB인베스트먼트",
          investors: ["LB인베스트먼트", "IMM인베스트먼트", "한국투자파트너스"],
        },
        occurred_on: "2025-07-22",
        date_precision: "day",
        status: "completed",
        summary: "1,000억원 시리즈 B 유치 (기업가치 6,200억원)",
        derivesFacts: true,
        assertions: [
          {
            src: "thebell",
            daysAgo: 335,
            title: "업스테이지, 1000억 시리즈B…밸류 6200억",
            snippet: "엔터프라이즈 AI 수요 증가에 힘입어 투자유치.",
            quote: "1000억원 규모 시리즈B를 유치했다",
          },
          {
            src: "venturesquare",
            daysAgo: 334,
            title: "업스테이지 시리즈B 1000억 클로징",
            snippet: "LB인베스트먼트 리드.",
            quote: "1000억원 규모 시리즈B",
            cluster: "upstage-b-wire",
          },
        ],
      },
      {
        type: "partnership",
        payload: {
          partner: "삼성전자",
          nature: "tech",
          description: "온디바이스 AI 모델 탑재 협력",
        },
        occurred_on: "2026-01-08",
        date_precision: "day",
        status: "announced",
        summary: "삼성전자와 온디바이스 AI 협력 MOU",
        assertions: [
          {
            src: "etnews",
            daysAgo: 165,
            title: "업스테이지, 삼성전자와 온디바이스 AI MOU",
            snippet: "갤럭시 AI 생태계 협력.",
            quote: "삼성전자와 온디바이스 AI 모델 공동 개발을 위한 MOU를 체결했다",
          },
        ],
      },
    ],
    facts: [
      {
        type: "employee_count",
        unit: "count",
        trueValue: 230,
        assertions: [
          {
            src: "platum",
            daysAgo: 335,
            value: 230,
            raw: "약 230명",
            quote: "임직원 약 230명",
            quality: "inferred",
          },
        ],
      },
      {
        type: "revenue",
        unit: "krw",
        trueValue: 48_000_000_000,
        assertions: [
          {
            src: "thebell",
            daysAgo: 335,
            value: 48_000_000_000,
            raw: "약 480억원",
            quote: "연 매출 약 480억원으로 추정",
            quality: "inferred",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 18. 채널코퍼레이션 (Channel.io) ──────────
  {
    id: "channel-corp",
    dart: null,
    ko: "채널코퍼레이션",
    en: "Channel Corporation",
    aliases: ["채널톡", "Channel Talk", "Channel.io", "채널코퍼레이션(주)"],
    sector: "B2B SaaS",
    stage: "Series C",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2014,
    description:
      "비즈니스 메신저·고객 지원 플랫폼 '채널톡'을 운영하는 B2B SaaS 기업. 국내외 10만여 기업 고객사를 보유하며 일본·미국에 진출해 있다.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series C",
          amount_krw: 60_000_000_000,
          post_money_krw: 500_000_000_000,
          lead_investor: "Bessemer Venture Partners",
          investors: ["Bessemer Venture Partners", "캡스톤파트너스", "SV인베스트먼트"],
        },
        occurred_on: "2024-04-25",
        date_precision: "day",
        status: "completed",
        summary: "600억원 규모 시리즈 C 유치",
        derivesFacts: true,
        assertions: [
          {
            src: "platum",
            daysAgo: 788,
            title: "채널코퍼레이션, 600억 시리즈C 유치",
            snippet: "글로벌 VC 베세머가 리드했다.",
            quote: "600억원 규모 시리즈C를 유치했다",
          },
          {
            src: "startuprecipe",
            daysAgo: 787,
            title: "채널톡 시리즈C 600억 클로징",
            snippet: "B2B SaaS 투자 확대.",
            quote: "600억원 규모 시리즈C",
            cluster: "channel-c-wire",
          },
        ],
      },
      {
        type: "executive_hire",
        payload: {
          person: "박소령",
          role: "CPO",
          direction: "join",
          effective_date: "2025-11-01",
        },
        occurred_on: "2025-11-01",
        date_precision: "day",
        status: "announced",
        summary: "신임 CPO 영입 — 글로벌 제품 전략 강화",
        assertions: [
          {
            src: "outstanding",
            daysAgo: 233,
            title: "채널톡, 전 라인 출신 CPO 영입",
            snippet: "글로벌 프로덕트 리더십 강화.",
            quote: "최고제품책임자(CPO)로 박소령 씨를 선임했다",
          },
        ],
      },
    ],
    facts: [
      {
        type: "employee_count",
        unit: "count",
        trueValue: 320,
        assertions: [
          {
            src: "platum",
            daysAgo: 200,
            value: 320,
            raw: "320명",
            quote: "임직원 320명",
            quality: "inferred",
          },
        ],
      },
      {
        type: "revenue",
        unit: "krw",
        trueValue: 70_000_000_000,
        assertions: [
          {
            src: "thebell",
            daysAgo: 200,
            value: 70_000_000_000,
            raw: "약 700억원",
            quote: "연간반복매출(ARR) 기준 약 700억원 추정",
            quality: "inferred",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 19. 루닛 (Lunit) ───────────────────────
  {
    id: "lunit",
    dart: "01998877",
    ko: "루닛",
    en: "Lunit",
    aliases: ["루닛(주)", "Lunit Inc."],
    sector: "Healthcare AI",
    stage: "Public",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2013,
    description:
      "AI 기반 암 진단 보조 솔루션 '루닛 인사이트'를 전 세계 병원에 공급하는 의료 AI 상장사. 코스닥에 상장돼 있다.",
    events: [
      {
        type: "ipo_completion",
        payload: {
          exchange: "KOSDAQ",
          offer_price_krw: 30_000,
          market_cap_krw: 600_000_000_000,
        },
        occurred_on: "2022-07-22",
        date_precision: "day",
        status: "completed",
        summary: "코스닥 기술특례 상장 완료",
        assertions: [
          {
            src: "krx",
            daysAgo: 1431,
            title: "[공시] 루닛 코스닥 신규상장",
            snippet: "기술특례 상장.",
            quote: "공모가 30,000원으로 코스닥 신규상장",
          },
        ],
      },
      {
        type: "acquisition",
        payload: {
          acquirer: "루닛",
          target: "Volpara Health",
          stake_pct: 100,
          amount_krw: 120_000_000_000,
        },
        occurred_on: "2024-01-18",
        date_precision: "day",
        status: "completed",
        summary: "뉴질랜드 유방암 AI 기업 볼파라 인수",
        assertions: [
          {
            src: "hankyung",
            daysAgo: 886,
            title: "루닛, 볼파라 1200억에 인수…글로벌 확장",
            snippet: "유방암 AI 포트폴리오 강화.",
            quote: "뉴질랜드 볼파라헬스를 약 1200억원에 인수했다",
          },
          {
            src: "etnews",
            daysAgo: 885,
            title: "루닛 볼파라 인수로 글로벌 의료AI 도약",
            snippet: "해외 의료 AI 시장 거점 확보.",
            quote: "볼파라 지분 100%를 확보했다",
            cluster: "lunit-volpara-wire",
          },
        ],
      },
    ],
    facts: [
      {
        type: "revenue",
        unit: "krw",
        trueValue: 82_000_000_000,
        assertions: [
          {
            src: "dart",
            daysAgo: 125,
            value: 82_000_000_000,
            raw: "820억원",
            quote: "2025년 매출 820억원",
            asOf: "2025-12-31",
            gen: 1,
          },
          {
            src: "dart",
            daysAgo: 490,
            value: 48_000_000_000,
            raw: "480억원",
            quote: "2024년 매출 480억원",
            asOf: "2024-12-31",
            gen: 0,
          },
        ],
      },
      {
        type: "valuation",
        unit: "krw",
        trueValue: 800_000_000_000,
        assertions: [
          {
            src: "krx",
            daysAgo: 2,
            value: 800_000_000_000,
            raw: "시가총액 8000억원",
            quote: "종가 기준 시가총액 약 8000억원",
            quality: "derived",
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 380,
        assertions: [
          {
            src: "dart",
            daysAgo: 125,
            value: 380,
            raw: "380명",
            quote: "임직원 380명",
            asOf: "2025-12-31",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 20. 메가존클라우드 ──────────────────────
  {
    id: "megazone",
    dart: "00987654",
    ko: "메가존클라우드",
    en: "Megazone Cloud",
    aliases: ["메가존", "Megazone", "메가존클라우드(주)", "MZC"],
    sector: "Cloud MSP",
    stage: "Pre-IPO",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 1998,
    description:
      "AWS·GCP·Azure 국내 최대 멀티클라우드 MSP. 클라우드 마이그레이션부터 운영·보안까지 엔드투엔드 서비스를 제공한다.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series C",
          amount_krw: 300_000_000_000,
          post_money_krw: 1_800_000_000_000,
          lead_investor: "한화자산운용",
          investors: ["한화자산운용", "IMM인베스트먼트", "GS건설"],
        },
        occurred_on: "2023-08-10",
        date_precision: "day",
        status: "completed",
        summary: "3,000억원 시리즈 C 유치 (기업가치 1.8조원)",
        derivesFacts: false,
        assertions: [
          {
            src: "hankyung",
            daysAgo: 1046,
            title: "메가존클라우드, 3000억 조달…기업가치 1.8조",
            snippet: "한화가 리드했다.",
            quote: "3000억원 규모 시리즈C를 유치했다",
          },
        ],
      },
      {
        type: "ipo_announcement",
        payload: {
          exchange: "KOSPI",
          target_date: "2026-H2",
          underwriters: ["KB증권", "한국투자증권"],
        },
        occurred_on: "2026-01-15",
        date_precision: "month",
        status: "announced",
        summary: "코스피 상장 2026 하반기 목표",
        assertions: [
          {
            src: "mt",
            daysAgo: 158,
            title: "메가존클라우드, 올해 코스피 상장 도전",
            snippet: "주관사 KB증권 선정 완료.",
            quote: "2026년 하반기 코스피 상장을 목표로 IPO 절차를 개시했다",
          },
          {
            src: "zdnet",
            daysAgo: 157,
            title: "메가존클라우드 IPO 추진 본격화",
            snippet: "클라우드 MSP 첫 대형 상장.",
            quote: "IPO 주관사로 KB증권을 선정했다",
            cluster: "megazone-ipo-wire",
          },
        ],
      },
    ],
    facts: [
      {
        type: "revenue",
        unit: "krw",
        trueValue: 1_600_000_000_000,
        assertions: [
          {
            src: "dart",
            daysAgo: 115,
            value: 1_600_000_000_000,
            raw: "1조6000억원",
            quote: "2025년 매출 1조6000억원",
            asOf: "2025-12-31",
          },
        ],
      },
      {
        type: "valuation",
        unit: "krw",
        trueValue: 1_800_000_000_000,
        assertions: [
          {
            src: "hankyung",
            daysAgo: 1046,
            value: 1_800_000_000_000,
            raw: "1.8조원",
            quote: "기업가치 1조8000억원",
            asOf: "2023-08-10",
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 1_800,
        assertions: [
          {
            src: "dart",
            daysAgo: 115,
            value: 1_800,
            raw: "1,800명",
            quote: "임직원 1,800명",
            asOf: "2025-12-31",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 21. 스캐터랩 (Scatter Lab) ─────────────
  {
    id: "scatterlab",
    dart: null,
    ko: "스캐터랩",
    en: "Scatter Lab",
    aliases: ["ScatterLab", "이루다", "Iruda", "스캐터랩(주)"],
    sector: "Conversational AI",
    stage: "Series B",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2014,
    description:
      "감성 대화 AI '이루다'와 연애 분석 앱 '텍스트앳'을 운영하는 대화형 AI 스타트업. B2C AI 캐릭터 플랫폼으로 방향을 확장했다.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series B",
          amount_krw: 45_000_000_000,
          post_money_krw: 300_000_000_000,
          lead_investor: "KB인베스트먼트",
          investors: ["KB인베스트먼트", "카카오벤처스", "DSC인베스트먼트"],
        },
        occurred_on: "2024-06-17",
        date_precision: "day",
        status: "completed",
        summary: "450억원 규모 시리즈 B 유치",
        derivesFacts: true,
        assertions: [
          {
            src: "platum",
            daysAgo: 735,
            title: "스캐터랩, 450억 시리즈B 유치",
            snippet: "이루다 운영사가 후속 투자를 유치했다.",
            quote: "450억원 규모 시리즈B를 유치했다",
          },
          {
            src: "venturesquare",
            daysAgo: 734,
            title: "스캐터랩 시리즈B 450억 클로징",
            snippet: "KB인베스트먼트 리드.",
            quote: "450억원 규모 시리즈B",
            cluster: "scatterlab-b-wire",
          },
        ],
      },
      {
        type: "partnership",
        payload: {
          partner: "SK텔레콤",
          nature: "tech",
          description: "AI 캐릭터 서비스 공동 개발 협력",
        },
        occurred_on: "2025-05-20",
        date_precision: "day",
        status: "announced",
        summary: "SK텔레콤과 AI 캐릭터 공동 개발 MOU",
        assertions: [
          {
            src: "etnews",
            daysAgo: 398,
            title: "스캐터랩·SKT, AI 캐릭터 서비스 협력",
            snippet: "통신사와 대화형 AI의 만남.",
            quote: "SK텔레콤과 AI 캐릭터 공동 개발 MOU를 체결했다",
          },
        ],
      },
    ],
    facts: [
      {
        type: "employee_count",
        unit: "count",
        trueValue: 110,
        assertions: [
          // deliberate conflict — aggregator under-reports headcount
          {
            src: "platum",
            daysAgo: 200,
            value: 110,
            raw: "110명",
            quote: "임직원 110명",
            quality: "inferred",
          },
          {
            src: "aggregator",
            daysAgo: 120,
            value: 80,
            raw: "80여 명",
            quote: "약 80여 명이 재직 중인 것으로 알려졌다",
            quality: "inferred",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 22. 트릿지 (Tridge) ────────────────────
  {
    id: "tridge",
    dart: null,
    ko: "트릿지",
    en: "Tridge",
    aliases: ["Tridge Inc.", "트릿지(주)"],
    sector: "AgriTech",
    stage: "Series C",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2015,
    description:
      "글로벌 농식품 무역 인텔리전스 플랫폼. 180개국 이상의 원자재·농산물 수출입 데이터를 제공하며 B2B 구독 모델로 성장 중이다.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series C",
          amount_krw: 90_000_000_000,
          post_money_krw: 700_000_000_000,
          lead_investor: "IMM인베스트먼트",
          investors: ["IMM인베스트먼트", "BRV캐피탈", "Bon Angels"],
        },
        occurred_on: "2024-11-05",
        date_precision: "day",
        status: "completed",
        summary: "900억원 규모 시리즈 C 유치",
        derivesFacts: true,
        assertions: [
          {
            src: "thebell",
            daysAgo: 594,
            title: "트릿지, 900억 시리즈C 유치…밸류 7000억",
            snippet: "글로벌 농식품 데이터 플랫폼 도약.",
            quote: "900억원 규모 시리즈C를 유치했다",
          },
          {
            src: "platum",
            daysAgo: 593,
            title: "트릿지 시리즈C 900억 클로징",
            snippet: "IMM 리드.",
            quote: "900억원 규모 시리즈C",
            cluster: "tridge-c-wire",
          },
        ],
      },
      {
        type: "executive_hire",
        payload: {
          person: "이승욱",
          role: "CRO",
          direction: "join",
          effective_date: "2026-04-01",
        },
        occurred_on: "2026-04-01",
        date_precision: "day",
        status: "announced",
        summary: "글로벌 세일즈 강화를 위한 CRO 영입",
        assertions: [
          {
            src: "startuprecipe",
            daysAgo: 82,
            title: "트릿지, 전 McKinsey 파트너 CRO 영입",
            snippet: "글로벌 매출 확대 전략.",
            quote: "최고매출책임자(CRO)로 이승욱 씨를 선임했다",
          },
        ],
      },
    ],
    facts: [
      {
        type: "employee_count",
        unit: "count",
        trueValue: 450,
        assertions: [
          {
            src: "thebell",
            daysAgo: 594,
            value: 450,
            raw: "450명",
            quote: "임직원 약 450명",
            quality: "inferred",
          },
        ],
      },
      {
        type: "revenue",
        unit: "krw",
        trueValue: 180_000_000_000,
        assertions: [
          {
            src: "thebell",
            daysAgo: 594,
            value: 180_000_000_000,
            raw: "약 1800억원",
            quote: "연 매출 약 1800억원 추정",
            quality: "inferred",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 23. 라이너 (Liner) ─────────────────────
  {
    id: "liner",
    dart: null,
    ko: "라이너",
    en: "Liner",
    aliases: ["Liner AI", "라이너(주)", "Liner Inc."],
    sector: "AI Productivity",
    stage: "Series B",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2015,
    description:
      "AI 검색·하이라이트 생산성 앱 'Liner'를 운영하는 스타트업. 전 세계 1,000만 명 이상의 사용자를 보유한 AI 검색 플랫폼.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series B",
          amount_krw: 50_000_000_000,
          post_money_krw: 380_000_000_000,
          lead_investor: "스톤브릿지벤처스",
          investors: ["스톤브릿지벤처스", "미래에셋벤처투자", "퓨처플레이"],
        },
        occurred_on: "2024-09-12",
        date_precision: "day",
        status: "completed",
        summary: "500억원 규모 시리즈 B 유치",
        derivesFacts: true,
        assertions: [
          {
            src: "platum",
            daysAgo: 648,
            title: "라이너, 500억 시리즈B 유치",
            snippet: "AI 검색 시장 공략을 가속한다.",
            quote: "500억원 규모 시리즈B를 유치했다",
          },
          {
            src: "startuprecipe",
            daysAgo: 647,
            title: "라이너 시리즈B 500억 클로징",
            snippet: "스톤브릿지 리드.",
            quote: "500억원 규모 시리즈B",
            cluster: "liner-b-wire",
          },
        ],
      },
      {
        type: "partnership",
        payload: {
          partner: "Google",
          nature: "tech",
          description: "구글 검색 AI 통합 파트너십",
        },
        occurred_on: "2025-11-10",
        date_precision: "day",
        status: "announced",
        summary: "구글과 AI 검색 연동 파트너십 체결",
        assertions: [
          {
            src: "zdnet",
            daysAgo: 224,
            title: "라이너, 구글과 AI 검색 통합 협력",
            snippet: "AI 검색 생태계 협력.",
            quote: "구글과 AI 검색 연동 파트너십을 체결했다",
          },
        ],
      },
    ],
    facts: [
      {
        type: "employee_count",
        unit: "count",
        trueValue: 90,
        assertions: [
          {
            src: "platum",
            daysAgo: 648,
            value: 90,
            raw: "90명",
            quote: "임직원 약 90명",
            quality: "inferred",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 24. 클래스101 ───────────────────────────
  {
    id: "class101",
    dart: null,
    ko: "클래스101",
    en: "Class101",
    aliases: ["Class101 Inc.", "클래스101(주)", "Class 101"],
    sector: "E-learning",
    stage: "Series C",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2018,
    description:
      "크리에이터 중심 온라인 클래스 플랫폼. 취미·커리어·자격증 등 다양한 분야의 강의 콘텐츠를 구독 모델로 제공한다.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series C",
          amount_krw: 60_000_000_000,
          post_money_krw: 450_000_000_000,
          lead_investor: "KKR",
          investors: ["KKR", "알토스벤처스", "포레스트파트너스"],
        },
        occurred_on: "2022-05-30",
        date_precision: "day",
        status: "completed",
        summary: "600억원 규모 시리즈 C 유치 (기업가치 4,500억원)",
        derivesFacts: false,
        assertions: [
          {
            src: "mk",
            daysAgo: 1483,
            title: "클래스101, KKR 포함 600억 시리즈C 유치",
            snippet: "글로벌 PE의 국내 이러닝 첫 투자.",
            quote: "600억원 규모 시리즈C를 유치했다",
          },
        ],
      },
      {
        type: "profitability_milestone",
        payload: {
          metric: "operating_profit",
          period: "2025-H2",
          value_krw: 2_000_000_000,
          turned_positive: true,
        },
        occurred_on: "2026-01-20",
        date_precision: "month",
        status: "completed",
        summary: "2025년 하반기 흑자 전환 달성",
        assertions: [
          {
            src: "thebell",
            daysAgo: 153,
            title: "클래스101, 하반기 첫 흑자 전환",
            snippet: "구독 모델 전환 효과.",
            quote: "2025년 하반기 영업이익 흑자 전환을 달성했다",
          },
        ],
      },
    ],
    facts: [
      {
        type: "employee_count",
        unit: "count",
        trueValue: 200,
        assertions: [
          {
            src: "platum",
            daysAgo: 180,
            value: 200,
            raw: "약 200명",
            quote: "임직원 약 200명",
            quality: "inferred",
          },
        ],
      },
      {
        type: "revenue",
        unit: "krw",
        trueValue: 130_000_000_000,
        assertions: [
          {
            src: "thebell",
            daysAgo: 153,
            value: 130_000_000_000,
            raw: "약 1300억원",
            quote: "2025년 연간 매출 약 1300억원",
            quality: "inferred",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 25. 센드버드 (Sendbird) ─────────────────
  {
    id: "sendbird",
    dart: null,
    ko: "센드버드",
    en: "Sendbird",
    aliases: ["Sendbird Inc.", "SendBird", "센드버드코리아"],
    sector: "Communication API",
    stage: "Series C",
    hqRegion: "Seoul",
    hq: "서울 강남구 / 미국 캘리포니아",
    founded: 2013,
    description:
      "앱 내 채팅·음성·영상 API를 제공하는 글로벌 통신 인프라 스타트업. 서비스형 소셜 인프라(Social Infrastructure-as-a-Service) 기업.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series C",
          amount_krw: 100_000_000_000,
          post_money_krw: 1_000_000_000_000,
          lead_investor: "ICONIQ Growth",
          investors: ["ICONIQ Growth", "Tiger Global", "Shasta Ventures"],
        },
        occurred_on: "2021-04-14",
        date_precision: "day",
        status: "completed",
        summary: "1,000억원 시리즈 C 유치 (기업가치 1조원, 유니콘 등극)",
        derivesFacts: false,
        assertions: [
          {
            src: "hankyung",
            daysAgo: 1895,
            title: "센드버드, 시리즈C 1000억 유치…유니콘 등극",
            snippet: "ICONIQ 리드로 유니콘에 올랐다.",
            quote: "1000억원 규모 시리즈C를 유치해 기업가치 1조원을 달성했다",
          },
        ],
      },
      {
        type: "executive_departure",
        payload: {
          person: "존 S. 김",
          role: "CEO",
          direction: "leave",
          effective_date: "2025-12-01",
        },
        occurred_on: "2025-12-01",
        date_precision: "month",
        status: "announced",
        summary: "공동창업자 존 김 CEO 사임",
        assertions: [
          {
            src: "bloter",
            daysAgo: 203,
            title: "센드버드 공동창업자 CEO 사임…새 대표 체제로",
            snippet: "경영 전환기.",
            quote: "공동창업자이자 CEO인 존 S. 김이 사임했다",
          },
        ],
      },
    ],
    facts: [
      {
        type: "valuation",
        unit: "krw",
        trueValue: 1_000_000_000_000,
        assertions: [
          {
            src: "hankyung",
            daysAgo: 1895,
            value: 1_000_000_000_000,
            raw: "1조원",
            quote: "기업가치 1조원을 달성했다",
            asOf: "2021-04-14",
          },
        ],
      },
      {
        type: "employee_count",
        unit: "count",
        trueValue: 350,
        assertions: [
          {
            src: "platum",
            daysAgo: 300,
            value: 350,
            raw: "350명",
            quote: "임직원 350명",
            quality: "inferred",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 26. 알스퀘어 ───────────────────────────
  {
    id: "rsquare",
    dart: null,
    ko: "알스퀘어",
    en: "R Square",
    aliases: ["알스퀘어(주)", "RSQ", "알스퀘어컴퍼니"],
    sector: "Commercial Real Estate",
    stage: "Series D",
    hqRegion: "Seoul",
    hq: "서울 강남구",
    founded: 2015,
    description:
      "기업 사무공간 임대차·관리 솔루션을 제공하는 B2B 상업용 부동산 플랫폼. 데이터 기반 오피스 컨설팅으로 차별화했다.",
    events: [
      {
        type: "funding_round",
        payload: {
          round_name: "Series D",
          amount_krw: 70_000_000_000,
          post_money_krw: 500_000_000_000,
          lead_investor: "어펄마캐피탈",
          investors: ["어펄마캐피탈", "타임와이즈인베스트먼트", "NH벤처투자"],
        },
        occurred_on: "2025-09-03",
        date_precision: "day",
        status: "completed",
        summary: "700억원 규모 시리즈 D 유치",
        derivesFacts: true,
        assertions: [
          {
            src: "thebell",
            daysAgo: 292,
            title: "알스퀘어, 700억 시리즈D 유치",
            snippet: "상업용 부동산 플랫폼 도약.",
            quote: "700억원 규모 시리즈D를 유치했다",
          },
          {
            src: "edaily",
            daysAgo: 291,
            title: "알스퀘어 시리즈D 700억 클로징",
            snippet: "어펄마 리드.",
            quote: "700억원 규모 시리즈D",
            cluster: "rsquare-d-wire",
          },
        ],
      },
      {
        type: "profitability_milestone",
        payload: {
          metric: "operating_profit",
          period: "2025-FY",
          value_krw: 8_000_000_000,
          turned_positive: true,
        },
        occurred_on: "2026-03-05",
        date_precision: "day",
        status: "completed",
        summary: "2025년 연간 흑자 전환 달성",
        assertions: [
          {
            src: "thebell",
            daysAgo: 109,
            title: "알스퀘어, 창사 이래 첫 연간 흑자",
            snippet: "B2B SaaS 수익화 성과.",
            quote: "2025년 처음으로 연간 영업이익 흑자를 달성했다",
          },
        ],
      },
    ],
    facts: [
      {
        type: "employee_count",
        unit: "count",
        trueValue: 280,
        assertions: [
          {
            src: "platum",
            daysAgo: 292,
            value: 280,
            raw: "280명",
            quote: "임직원 280명",
            quality: "inferred",
          },
        ],
      },
      {
        type: "revenue",
        unit: "krw",
        trueValue: 220_000_000_000,
        assertions: [
          {
            src: "thebell",
            daysAgo: 292,
            value: 220_000_000_000,
            raw: "약 2200억원",
            quote: "2025년 매출 약 2200억원 추정",
            quality: "inferred",
          },
        ],
      },
    ],
  },
]
