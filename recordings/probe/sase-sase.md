# #/sase/sase
title: SASE 서비스 목록 | SASE | Global | Console
list buttons: ["서비스 생성","서비스 생성"]
headers: SASE명 | 서비스 | 레벨 | 서비스 | 유형 | 계약 | 기간 | 상태
rows: 0

## "서비스 생성" → /sase/sase/new — SASE 생성 | SASE | Global | Console
- SASE명 | input[text] | 영문과 숫자를 사용하여 3~20자로 입력하세요. 0/20
- 서비스 레벨 - Essential: ZTNA, Stateful FW, DDoS Protection, DNS  | div.checkbox "Essential", div.checkbox "Advanced", div.checkbox "Premium" | Essential Advanced Premium
- 서비스 유형 | div.checkbox "Agent type", div.checkbox "Edge type" | Agent typeEdge type
-  | (컨트롤 없음) | 
-  | (컨트롤 없음) | 
-  | (컨트롤 없음) | 
- 약정 기간* ※ 약정 기간은 신청 후 수정 불가합니다. | button[submit] "None", button[submit] "3년", button[submit] "5년", button[submit] "7년" | None 3년 5년 7년
- 기타 요청사항 | input[text] | 50자 이내로 입력하세요. 0/50
buttons: ["None","3년","5년","7년","요금 확인","취소","생성(dis)"]
