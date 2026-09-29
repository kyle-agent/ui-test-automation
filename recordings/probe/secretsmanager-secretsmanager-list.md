# #/secretsmanager/secretsmanager/list
title: Secrets Manager 목록 | Secrets Manager | kr-west1 | Console
list buttons: ["서비스 해지(dis)","","상세 검색","서비스 생성","서비스 생성"]
headers:  | Secret명 | 생성 | 일시 | 최근 | 검색 | 일시 | 삭제 | 예정 | 일시 | 상태 | 
rows: 0

## "서비스 생성" → /secretsmanager/secretsmanager/request — Secrets Manager 생성 | Secrets Manager | kr-west1 | Console
- Secret명 | input[text] | 영문, 숫자와 특수문자(-_)를 사용하여 3~63자로 입력하세요. 0/63
- 유형 Secret으로 암호화하여 관리하고자 하는 유형을 선택합니다. | div.dropdown "일반 유형의 Secret" | 일반 유형의 Secret
- Key/Value 입력 Secret 정보를 Key/Value(키/값)를 Pair(쌍)로 입력합니다. 최대 1 | button[submit], input[text], input[text], button[submit] "추가" | Key Value Key 값을 입력하세요. Value 값을 입력하세요. 추가
-  | button[submit], input[text], input[text], button[submit] "추가" | Key Value Key 값을 입력하세요. Value 값을 입력하세요. 추가
- Key | (컨트롤 없음) | 
- Value | (컨트롤 없음) | 
-  | button[submit], input[text], input[text] | Key 값을 입력하세요. Value 값을 입력하세요.
- 암호화 키 사용자가 생성한 KMS 키를 사용하여 Secret을 암호화 할 수 있습니다. | div.dropdown "선택하세요." | 선택하세요.
- 퍼블릭 접근 제어 사용 설정하면 접근 허용 목록에 추가한 IP 대역만 허용합니다. 접근 허용 IP는 필수로  | input[text], button[submit] "추가", button[submit] "전체 삭제" | 퍼블릭 접근 허용 IP ex) 192.168.11.1/32 추가 추가할 IP 총 0/10 전체 삭제 추가된 IP가 없습니다. 10개 이내의 IP를 추가하세요.
- 프라이빗 접근 제어 사용 설정하면 접근 허용 목록에 추가한 리소스의 접근만 허용합니다. 사용 설정하지 않으면 | div.checkbox "사용" | 사용
-  | div.dropdown "5개씩 보기", button[submit] "삭제", button[submit] "추가", div.checkbox | 프라이빗 접근 허용 리소스 총 0 5개씩 보기 삭제 추가 서비스 리소스명 No data
- 프라이빗 접근 허용 리소스 | div.dropdown "5개씩 보기", button[submit] "삭제", button[submit] "추가", div.checkbox | 총 0 5개씩 보기 삭제 추가 서비스 리소스명 No data
- 설명 | textarea[textarea] | 100자 이내로 입력하세요. 0/100
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["(dis)","추가","추가(dis)","전체 삭제(dis)","삭제(dis)","추가","태그 추가","요금 확인","취소","생성(dis)"]
  dropdown "유형": ["일반 유형의 Secret"]
  dropdown "암호화": ["일반 유형의 Secret"]
  dropdown "": ["일반 유형의 Secret"]

## 2026-09-29 실측 (에이전트 A, 생성·해지 예약·해지 취소)
- 위 "암호화" 드롭다운 항목은 프로브 오류(유형 드롭다운을 다시 연 것). 실제 "암호화 키" 드롭다운에는 기본 관리형 키 "scp/secretsmanager" 가 있다 → KMS 키를 따로 만들 필요 없음.
- 퍼블릭 접근 허용 IP 필수, 프라이빗 접근 제어 기본 켜짐(끔).
- Key/Value 입력란은 placeholder 가 별도 요소라 Value 칸은 Key 칸 다음 input 으로 잡는다. 프로그램식 fill 이 가끔 반영되지 않음(키보드 보강).
- "추가" 버튼 순서: Key/Value 추가(0) · IP 추가(1) · 프라이빗 리소스 추가.
- 생성 확인 "Secrets Manager를 생성하시겠습니까?" 뒤 3~7초 후 목록 이동, Active.
- 해지 모달: "해지 대기 기간 [30] 일"(7~30, 1 이면 확인 비활성) → 7 → 목록 "삭제 예정 일시 2026-10-06 19:00:00 · To be terminated".
- 상세 상단 "해지 취소" → "Secrets Manager 해지를 취소하시겠습니까?" → Active, 버튼이 "서비스 해지" 로 바뀜.
