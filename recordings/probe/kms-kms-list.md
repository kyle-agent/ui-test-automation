# #/kms/kms/list
title: 고객 관리형 키 목록 | Key Management Service | kr-west1 | Console
list buttons: ["서비스 해지(dis)","","상세 검색","서비스 생성","서비스 생성"]
headers:  | 키명 | 용도 | 생성 | 일시 | 삭제 | 예정 | 일시 | 상태 | 
rows: 0

## "서비스 생성" → /kms/kms/request — 고객 관리형 키 생성 | Key Management Service | kr-west1 | Console
- 키명 사용자가 생성하는 키명을 입력합니다. | input[text] | 영문 소문자와 숫자를 사용하여 3~63자로 입력하세요. 0/63
- 용도 용도에 따른 암호화 방식을 선택할 수 있습니다. | div.dropdown "암/복호화(AES-256)" | 암/복호화(AES-256)
- 자동 회전 회전 주기마다 생성한 키의 내부 알고리즘을 다른 값으로 자동으로 변환합니다. | div.checkbox "사용" | 사용
-  | input[text] | 회전 주기 일
- 퍼블릭 접근 제어 사용 설정하면 접근 허용 목록에 추가한 IP 대역만 허용합니다. 접근 허용 IP는 필수로  | input[text], button[submit] "추가", button[submit] "전체 삭제" | 퍼블릭 접근 허용 IP ex) 192.168.11.1/32 추가 추가할 IP 총 0/10 전체 삭제 추가된 IP가 없습니다. 10개 이내의 IP를 추가하세요.
- 프라이빗 접근 제어 사용 설정하면 접근 허용 목록에 추가한 리소스의 접근만 허용합니다. 사용 설정하지 않으면 | div.checkbox "사용" | 사용
-  | div.dropdown "5개씩 보기", button[submit] "삭제", button[submit] "추가", div.checkbox | 프라이빗 접근 허용 리소스 총 0 5개씩 보기 삭제 추가 서비스 리소스명 데이터가 없습니다.
- 설명 | textarea[textarea] | 100자 이내로 입력하세요. 0/100
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["추가(dis)","전체 삭제(dis)","삭제(dis)","추가","태그 추가","요금 확인","취소","생성(dis)"]
  dropdown "용도": ["암/복호화(AES-256)","암/복호화 및 서명/검증(RSA-2048)","서명/검증(ECDSA)","생성/검증(HMAC)"]
  dropdown "": ["암/복호화(AES-256)","암/복호화 및 서명/검증(RSA-2048)","서명/검증(ECDSA)","생성/검증(HMAC)"]

## 2026-09-29 실측 (에이전트 A, 생성·해지까지)
- 폼 체크박스 실제 상태: 공공 인증 알고리즘(끔) · 자동 회전(켜짐, 90일) · 프라이빗 접근 제어(켜짐). 퍼블릭 접근 제어는 토글이 없고 "접근 허용 IP 필수" → IP 1개 "추가" 전엔 "생성" 비활성.
- 체크박스가 라벨 오른쪽에 있어 below() 로는 다음 칸 컨트롤을 잡는다 → src/console/form-group.ts groupControl/setGroupCheckbox.
- "요금 확인" 은 폼이 유효해도 알림 ['Field required'] 만 띄운다(누르지 않음).
- 생성 확인 "고객 관리형 키를 생성하시겠습니까? 규모에 따라 수십 분…" → 목록에 곧바로 Active.
- 해지 모달: 해지 방식 "즉시 해지"(기본) | "예약 해지" + 동의 체크 → 즉시 해지는 목록에서 바로 사라진다.
