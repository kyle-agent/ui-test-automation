# #/loadbalancer/loadbalancer/list
title: Load Balancer 목록 | Load Balancer | kr-west1 | Console
list buttons: ["서비스 해지(dis)","상세 검색","서비스 생성","서비스 생성"]
headers:  | Load | Balancer명 | 서비스 | 구분 | Listener | 수 | Source | NAT | IP | Service | IP | Availability | Zone | 생성 | 일시 | 상태 | 
rows: 0

## "서비스 생성" → /loadbalancer/loadbalancer/request — Load Balancer 생성 | Load Balancer | kr-west1 | Console
- Load Balancer명 | input[text] | 영문, 숫자와 특수문자(-_)를 사용하여 3~63자 이내로 입력하세요. 0/63
- 서비스 구분 Load Balancer 유형을 선택합니다. L4는 TCP, UDP, TLS, TCP_PROXY | div.dropdown "L4" | L4
- VPC명 | div.dropdown "선택하세요." | 선택하세요.
- Service Subnet명 | div.dropdown "선택하세요." | 선택하세요.
- Availability Zone 1 | div.dropdown "선택하세요." | 선택하세요.
- Service IP | div.dropdown "자동 할당" | 자동 할당
- Public NAT IP 외부(인터넷)으로부터 서비스 접근을 허용할 경우 Service IP에 연결할 Pub | div.checkbox "사용" | 사용
- Source NAT IP Load Balancer에서 서버 연결에 사용할 IP를 설정합니다. Service  | div.dropdown "자동 할당" | 자동 할당
- 헬스 체크 IP 멤버 헬스 체크에 사용할 IP를 설정합니다. Service Subnet 대역 중 가용한 IP | div.dropdown "자동 할당" | 자동 할당
- 설명 | textarea[textarea] | 255자 이내로 입력하세요. 0/255
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","요금 확인","취소","생성(dis)"]
  dropdown "서비스": ["L4","L7"]
  dropdown "VPC명": []
