# #/vpc/subnet/list
title: Subnet 목록 | VPC | kr-west1 | Console
list buttons: ["삭제(dis)","상세 검색","Subnet 생성","Subnet 생성"]
headers:  | Subnet명 | Subnet | ID | VPC명 | Subnet | 유형 | Subnet | 구분 | IP | 대역 | Gateway | IP | Availability | Zone | 생성 | 일시 | 상태 | 
rows: 0

## "Subnet 생성" → /vpc/subnet/request — Subnet 생성 | VPC | kr-west1 | Console
- VPC명 | div.dropdown "선택하세요." | 선택하세요.
- VPC IP 대역 | (컨트롤 없음) | 선택된 VPC가 없습니다. VPC를 선택하세요.
- Subnet 유형 | div.dropdown "선택하세요." | 선택하세요.
- Subnet 구분 · Primary Subnet을 먼저 생성한 후, 해당 Subnet 하위에 Secondar | div.dropdown "선택하세요." | 선택하세요.
- Subnet명 | input[text] | 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요. 0/20
- IP 대역 · VPC 내 사용중인 IP 대역과 중복되지 않아야 합니다. 또한, 연결된 다른 VPC 및 고객사 | input[text] | CIDR 형식으로 /16~/28 범위 내에서 입력하세요. ex) 192.168.0.0/16
- Gateway IP · Gateway IP 주소 입력 시 아래의 조건을 만족해야 합니다. - Subnet I | input[text] | 
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- IP 할당 범위 · Subnet 하위 자원은 입력한 'IP 대역 전체' 또는 사용자가 '개별 지정'한 범위  | div.dropdown "IP 대역 전체" | IP 대역 전체
- DNS Name Server · Subnet에서 사용하는 DNS Name Server 주소를 입력할 수 있습 | div.checkbox "사용" | 사용
- 호스트 경로 · Subnet에서 사용하는 추가 경로를 입력할 수 있습니다. · 목적지 IP 대역들이 서로 중 | div.checkbox "사용" | 사용
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
  dropdown "VPC명": []
  dropdown "Subnet": []
  dropdown "Subnet": []
  dropdown "IP": ["IP 대역 전체","개별 지정"]
