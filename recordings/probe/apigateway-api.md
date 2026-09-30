# #/apigateway/api (2026-09-29, 에이전트 A)
list buttons: ["서비스 해지(dis)","서비스 생성","API 생성"]; headers: API명 | 설명 | API 엔드포인트 유형 | 생성 일시 | 상태 (행 끝 "서비스 해지")

## "서비스 생성" → /apigateway/api/request
- API명(소문자 시작, 소문자·숫자·- 3~50자, - 로 끝 불가) | 생성 방법 새로 생성/기존 API 복제 | 설명 50자 | 엔드포인트 유형 Region/Private | 태그
- 확인 "API를 생성하시겠습니까?" → 몇 초 뒤 목록 Creating → Active 약 3~4분.

## 리소스 #/apigateway/resource — 제목 옆 API 드롭다운 + "조회"(API 1개면 자동 선택 → /resource/detail?apiId=…&resourceId=…)
- 트리 "/" · "리소스 생성" 모달(리소스명 소문자·숫자·-{} 3~50자, 경로) → "리소스를 생성하시겠습니까? 생성 후에는 수정이 불가능합니다."
- 리소스 상세 "메서드 생성" 모달: 메서드 유형(ANY·DELETE·GET·HEAD·OPTIONS·PATCH·POST·PUT), 통합 유형 HTTP/Cloud Function/PrivateLink, 엔드포인트 URL,
  쿼리 파라미터·헤더·API Key·IAM(끔) → 확인 → "메서드를 생성하시겠습니까?" → 메서드 상세(…&methodType=GET).
- "API 배포" 모달: 스테이지명(New Stage) + 신규 스테이지명 + 배포 설명 → "배포" → "API를 배포하시겠습니까?".

## 스테이지 #/apigateway/stage — 트리(스테이지) + 배포 이력 표(배포 일시 | 상태 Active | 설명 | 배포 ID), 버튼 스테이지 생성·배포 변경·삭제·수정

## 해지: 목록 행 "서비스 해지" → "API를 해지하시겠습니까? 확인을 위해 삭제를 입력" → 바로 사라짐(스테이지·리소스 포함).

## 2차 (2026-09-30, 에이전트 A) — 인증·접근 제어·사용량 정책·API Key·Cloud Functions 트리거
- 인증 #/apigateway/authentication: 버튼 "JSON Web Token 생성" → 모달(JWT명 소문자 시작 3~50 · 만료 기간 드롭다운 31 Days · 연결할 스테이지 "사용" 체크 → 스테이지명 다중 선택 드롭다운(고른 뒤에도 메뉴가 열려 있음)) → 확인.
  목록 헤더 인증명 | 인증 수단 JWT(JSON WEB TOKEN) | 연결된 스테이지 수 | 만료 예정 일시(+31일). 삭제는 행 선택 → "삭제".
- 접근 제어 #/apigateway/accessControl: "접근 제어 생성" 모달(접근 제어명 · Public 접근 허용 IP(쉼표, 최대 100) · 연결할 스테이지 사용 · 설명) → 확인.
- 사용량 정책 #/apigateway/usagePlan: "사용량 정책 생성" → 화면 /usagePlan/request(연결할 API명 · 사용량 정책명 · 할당량 + 매월/매일/매시 · 설명) → "완료".
  상세 /usagePlan/detail: 버튼 "사용량 정책 삭제", "연결된 API Key" 표(삭제 · 추가 · "API Key 생성"). "API Key 생성" 모달: API Key명 · 설명.
- 세 목록 모두 제목 옆 API 드롭다운 + "조회" 가 있어야 행이 보인다.
- Cloud Functions 상세 "트리거 추가" → 트리거 종류 API Gateway → API명 → 스테이지명 → 확인 → "트리거를 추가하시겠습니까?" → 모달이 스피너로 ≈20초 남은 뒤 닫힘.
  결과: API 에 리소스 /<함수명> + 메서드 7종(DELETE·GET·HEAD·OPTIONS·PATCH·POST·PUT) 자동 생성, 함수 "트리거 (7)" (행 "apigateway <API>/<METHOD>/<함수명>").
