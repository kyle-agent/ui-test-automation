# #/messagehub/domain (2026-09-29, 에이전트 A) — Message Hub > Email 관리 > Domain
list buttons: ["삭제(dis)","상세 검색","Domain 추가"]; headers: Email 도메인 | 등록 일시 | 인증 상태

## "Domain 추가" → /messagehub/domain/request
- Email 도메인(소문자·숫자·- 3자 이상 + TLD, 255자) | 설명 50자 | 태그 → "완료" → "Domain을 추가하시겠습니까?"
- 등록 직후 인증 상태 "확인 필요". 도메인 소유 확인(DNS)은 별도 동작 — 하지 않음.
- 삭제: 행 선택 → "삭제" → "Domain을 삭제하시겠습니까? … 발신자 Email 주소의 메시지가 정상 수신되지 않을 수 있습니다."
