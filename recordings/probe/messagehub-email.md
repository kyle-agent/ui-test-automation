# #/messagehub/email (2026-09-29, 에이전트 A) — Message Hub > Email 관리 > Email
list buttons: ["삭제(dis)","상세 검색","Email 추가"]; headers: Email Address | 등록 일시 | 인증 상태
- 목록의 주소는 앞 3글자만 남기고 가려진다: "mhe***@*******.com". 검색창("Email Address를 입력하세요.")에 전체 주소를 넣으면 걸러진다(검색어는 SPA 안에서 유지됨).

## "Email 추가" → /messagehub/email/request
- Email Address(254자) | 설명 | 태그 → "완료" → "Email을 추가하시겠습니까?" → 토스트 "Email 추가가 성공하였습니다."
- 등록 직후 인증 상태 "확인 필요". 상세(#/messagehub/email/detail/info?emailId=…) 제목·"Email Address" 에 전체 주소,
  버튼 "Email 인증"(인증 메일 발송 — 누르지 않음), "Email 삭제" → "Email을 삭제하시겠습니까?".
- Phone Book(#/messagehub/phone) 은 SMS 인증이 필요해 제외.
