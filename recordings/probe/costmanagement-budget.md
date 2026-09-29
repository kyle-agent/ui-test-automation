# #/costmanagement/budget (2026-09-29, 에이전트 A) — Cost Management > 예산 관리 (Global)
list buttons: ["수정(dis)","⋮(i.i-card-handle)","예산 생성"]
headers: 예산명 | 관리 유형 | 예산 설정 금액 | 이번달 이용 금액 | 소진율 | 이번달 예상 이용 금액 | 예상 소진율 | 시작월
- 이름 링크·상세 없음. 상단 "⋮" 메뉴: Cost Navigator 연결 · Cost Navigator 연결 해제 · 삭제.

## "예산 생성" → /costmanagement/budget/create
- 예산명(20자) | 관리 유형 월별(기본)/전체 | 예산 (￦)(fill 로 넣으면 1,000,000 표시; 키보드 입력은 쉼표 때문에 자릿수가 빠짐 1000000 → 10000) |
  시작월(YYYY-MM 달력, 이번 달) | 임계치 도달 알림(기본 끔) | 신규 생성 방지(기본 끔 — 켜면 VM 등 신규 생성이 막힌다).
- 확인 "예산을 생성하시겠습니까?" → 목록. 수정 #/costmanagement/budget/<id>/modify → "완료". 삭제 확인 "예산을 삭제하시겠습니까?".
- API 제약: 계정당 예산 1개.
