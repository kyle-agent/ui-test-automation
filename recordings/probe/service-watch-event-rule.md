# #/service-watch/event/rule (2026-09-29, 에이전트 A)
list buttons: ["삭제(dis)","","상세 검색","이벤트 규칙 생성"]; headers: 이벤트 규칙명 | 상태

## "이벤트 규칙 생성" → /service-watch/event/rule/request
- 이벤트 규칙명: 영문·숫자만 3~60자 | 설명 | 이벤트 소스(서비스 70여 개: … Key Management Service, Queue, Sample, Secrets Manager …) | 이벤트 유형(소스별: KMS → 전체/Key/Managed Key)
- 적용 이벤트(모든/개별), 적용 자원(모든/개별) — 소스·유형을 고르면 활성. 이벤트 패턴 설정 현황(JSON 미리보기).
- 알림 수신자 선택 / 알림 그룹 선택: 선택 사항(비워 두면 메일 없음). 소스+유형만 고르면 "생성" 활성.
- 확인 "이벤트 규칙을 생성하시겠습니까?" → 목록 Active.

## 상세 #/service-watch/event/rule/<id>/info — "활성화"/"비활성화"/"이벤트 규칙 삭제"
- "이벤트 규칙을 비활성화 하시겠습니까?" → 목록 Inactive.
- 목록 삭제: 행 선택 → "삭제" → "이벤트 규칙을 삭제하시겠습니까?".
