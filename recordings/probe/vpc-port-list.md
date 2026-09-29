# #/vpc/port/list
title: Port 목록 | VPC | kr-west1 | Console
list buttons: ["삭제(dis)","상세 검색","Port 생성","Port 생성"]
headers:  | Port명 | Subnet명 | 고정 | IP | MAC | 주소 | 연결된 | 자원 | 생성 | 일시 | 상태 | 
rows: 0

## "Port 생성" → /vpc/port/request — Port 생성 | VPC | kr-west1 | Console
- VPC명 | div.dropdown "선택하세요." | 선택하세요.
- Subnet명 | div.dropdown "선택하세요." | 선택하세요.
- Port명 | input[text] | 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요. 0/20
- IP 할당 방식 자동 할당: Subnet의 IP 할당 범위 내에서 자동으로 IP가 할당됩니다. 직접 입력:  | div.dropdown "자동 할당" | 자동 할당
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- Security Group | div.checkbox "사용" | 사용
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
  dropdown "VPC명": ["vpc-0923-1738-196a"]
  dropdown "IP": ["자동 할당","직접 입력"]
