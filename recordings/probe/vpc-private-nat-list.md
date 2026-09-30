# #/vpc/private-nat/list
title: Private NAT 목록 | VPC | kr-west1 | Console
list buttons: ["삭제(dis)","상세 검색","Private NAT 생성","Private NAT 생성"]
headers:  | Private | NAT명 | 연결 | 자원 | 유형 | 연결 | 자원명 | NAT | IP | 대역 | 생성 | 일시 | 상태 | 
rows: 0

## "Private NAT 생성" → /vpc/private-nat/request — Private NAT 생성 | VPC | kr-west1 | Console
- Private NAT명 | input[text] | 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요. 0/20
- 연결 자원 유형 | div.dropdown "선택하세요." | 선택하세요.
- 연결 자원명 | div.dropdown "선택하세요." | 선택하세요.
- NAT IP 대역 연결된 VPC의 IP 대역과 중복되지 않아야 합니다. 선택한 Direct Connect 또 | input[text] | CIDR 형식으로 /22~/28 범위 내에서 입력하세요. ex) 192.168.0.0/16
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","요금 확인","취소","생성(dis)"]
  dropdown "연결": ["Direct Connect","Transit Gateway (Uplink)"]
  dropdown "연결": ["Direct Connect","Transit Gateway (Uplink)"]
