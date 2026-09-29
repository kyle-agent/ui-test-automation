# #/vpn/vpn/list
title: VPN 목록 | VPN | kr-west1 | Console
list buttons: ["서비스 생성","서비스 생성"]
headers: VPN | Gateway명 | Public | IP | 생성 | 일시 | 상태
rows: 0

## "서비스 생성" → /vpn/vpn/request — VPN 생성 | VPN | kr-west1 | Console
- VPN Gateway명 | input[text] | 영문과 숫자를 사용하여 3~20자로 입력하세요. 0/20
- 연결 VPC명 | div.dropdown "선택하세요." | 선택하세요.
- Public IP | div.dropdown "선택하세요." | 선택하세요.
- 설명 | textarea[textarea] | 40자 이내로 입력하세요. 0/40
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","요금 확인","취소","생성(dis)"]
  dropdown "연결": ["vpc-0929-1700-b001"]
  dropdown "Public": []
