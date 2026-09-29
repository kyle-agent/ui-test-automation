# #/scf/cloudfunctions/detail/info?cloudFunctionId=… — Cronjob 트리거 (2026-09-29 프로브, 에이전트 C)
detail buttons: ["서비스 해지","트리거 추가"] tabs: 상세정보 | 모니터링 | 로그 | 코드 | 구성 | 트리거 (n) | 태그 (n) | 작업 이력

## "트리거 추가" → 모달 "트리거 추가"
- 트리거 종류 | div.dropdown "선택하세요." | 항목 ["API Gateway","Cronjob"]
- (Cronjob) Cronjob 설정 | 안내(리눅스 크론탭 문법, 예시) + 입력 5칸 분 / 시 / 일 / 월 / 요일 (input[text], placeholder 없음, 힌트 "위 안내를 참고하여…")
- Timezone 설정 | div.dropdown "GMT +09:00 (Asia/Seoul)"
buttons: ["취소","확인(dis)"] → 5칸을 채우면 확인 활성 → "트리거를 추가하시겠습니까?" → 토스트 "트리거 추가가 성공하였습니다."
- 프로그램식 fill 이 한 번 반영되지 않아 확인이 비활성으로 남은 적 있음(1차 spec 실행) → 키보드 입력.

## 트리거 탭
- "트리거 (1)", 표 헤더 트리거 종류 | 트리거 서비스명, 행 "cronjob | cronjob|Asia/Seoul|* * * * *" (행 버튼 "수정", 선택 아이콘 있음)
- 삭제: 행 선택 → 표 위 "삭제" → 모달 "트리거 서비스명: cronjob|Asia/Seoul|* * * * * / 트리거를 삭제하시겠습니까?" → "트리거 1개 삭제가 성공하였습니다." → "트리거 (0)"

## 실행 확인 (로그 탭 #/scf/cloudfunctions/detail/log)
- 로그 줄 형식 "[2026-09-29T09:12:04.316391312Z]    nodejs REST API running on port 8080!" (UTC, 공백에 nbsp 섞임)
- 생성 직후 1회 기동 → 호출이 없으면 약 80초 뒤 "Got SIGTERM. Graceful shutdown start" (트리거 없이 5분 관찰: 추가 기동 없음)
- 매분 크론 추가 뒤 다음 정각 분 +3초에 기동 로그 2줄(09:40:03, 09:40:04) → 80초 뒤 SIGTERM. 이후 몇 분간 추가 기동은 보이지 않았다(기본 코드는 요청마다 로그를 남기지 않음).
- 모니터링 탭은 차트(Invocations/Success/Error Calls)라 텍스트로 읽을 수 없다.
