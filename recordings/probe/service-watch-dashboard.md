# #/service-watch/dashboard (2026-09-29, 에이전트 A)
title: 대시보드 목록 | ServiceWatch
list buttons: ["삭제(dis)","상세 검색","대시보드 생성"] — 서비스 대시보드 15개(Block Storage VM … Virtual Server) + 사용자 대시보드
headers: 대시보드명 | 대시보드 구분(서비스/사용자) | 수정 일시 | 생성 일시 | 즐겨찾기
메뉴(LNB): 대시보드(목록·즐겨찾기) · 경보(경보 이력 · 경보 정책 #/service-watch/alert/policy) · 지표 · 로그(로그 그룹 · 로그 그룹 내보내기) · 이벤트 규칙.
screens.txt 의 /service-watch/alert 는 직접 열면 홈으로 돌아간다(실제 화면은 /service-watch/alert/policy).

## "대시보드 생성" → /service-watch/dashboard/request
- 제목 옆 이름 입력란(.dashboard-sub-field input, 기본 Dashboard_YYMMDD_HHMMSS, maxlength 40), 기간 버튼(1시간·3시간·1일·1주·직접 입력), "생성"(위젯 0개면 비활성).
- 위젯 추가 방법: 개별 위젯 추가 · 다중 위젯 추가 · 대시보드 불러오기(사용자 대시보드에서).
- "개별 위젯 추가" 모달: 지표 트리(네임스페이스 행 i.i-tree-open → 차원 행 "resource_id | 40" → 지표 표 행 i.table-select). 선택하면 미리보기 차트 → "완료".
  지표는 지표를 남긴 자원이 있어야 보인다(삭제된 Object Storage 버킷의 all_requests 등). 헬퍼: src/console/servicewatch.ts pickFirstMetric.
- 생성 확인 "대시보드를 생성하시겠습니까?" → 목록(대시보드 구분 "사용자").
- 삭제: 행 선택 → "삭제" → "대시보드를 삭제하시겠습니까? 확인을 위해 삭제를 입력하세요."
