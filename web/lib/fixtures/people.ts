/**
 * Founder / key-people seed, keyed by company id. Execs are also derived from
 * executive_hire / executive_departure events at query time (see mock-api
 * getCompanyPeople); this provides founders, who rarely appear as "events".
 *
 * Plausible Korean founder names; some real, some invented for demo breadth.
 */
export interface Person {
  name: string
  role: string
  prior?: string // prior affiliation / background
}

export const FOUNDERS: Record<string, Person[]> = {
  furiosa: [{ name: "백준호", role: "대표 (CEO)", prior: "ex-Samsung Electronics, AMD" }],
  toss: [{ name: "이승건", role: "대표 (CEO)", prior: "치과의사 출신 창업가" }],
  kurly: [{ name: "김슬아", role: "대표 (CEO)", prior: "ex-Goldman Sachs, McKinsey" }],
  vuno: [{ name: "이예하", role: "대표 (CEO)", prior: "ex-Samsung Electronics" }],
  apr: [{ name: "김병훈", role: "대표 (CEO)" }],
  wrtn: [{ name: "이세영", role: "대표 (CEO)" }],
  mathpresso: [
    { name: "이용재", role: "공동대표 (Co-CEO)" },
    { name: "이종흥", role: "공동대표 (Co-CEO)" },
  ],
  dalpha: [{ name: "천세희", role: "대표 (CEO)", prior: "AI 프로덕트 빌더" }],
  dunamu: [{ name: "송치형", role: "회장 (Chairman)", prior: "증권사 개발자 출신" }],
  yanolja: [{ name: "이수진", role: "총괄대표 (CEO)", prior: "모텔 매니저 출신 창업가" }],
  musinsa: [{ name: "조만호", role: "창업자 (Founder)" }],
  rebellions: [{ name: "박성현", role: "대표 (CEO)", prior: "ex-Intel, Morgan Stanley" }],
  lunit: [{ name: "서범석", role: "대표 (CEO)", prior: "의사 출신 창업가" }],
  daangn: [{ name: "김용현", role: "공동대표", prior: "ex-Kakao" }],
  upstage: [{ name: "김성훈", role: "대표 (CEO)", prior: "ex-Naver Clova, NCSOFT" }],
}
