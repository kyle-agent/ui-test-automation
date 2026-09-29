# #/loadbalancer/loadbalancer-server-group/list
title: LB 서버 그룹 목록 | Load Balancer | kr-west1 | Console
list buttons: ["삭제(dis)","상세 검색","LB 서버 그룹 생성","LB 서버 그룹 생성"]
headers:  | LB | 서버 | 그룹명 | 프로토콜 | Load | Balancer명 | LB | 헬스 | 체크 | ID | 멤버 | 수 | 생성 | 일시 | 상태 | 
rows: 0

## "LB 서버 그룹 생성" → /loadbalancer/loadbalancer-server-group/request — LB 서버 그룹 생성 | Load Balancer | kr-west1 | Console
- LB 서버 그룹명 | input[text] | 영문, 숫자와 특수문자(-_)를 사용하여 3~63자 이내로 입력하세요.(시작과 마지막 글자는 영문, 숫자만 가능) 0/63
- VPC명 | div.dropdown "선택하세요." | 선택하세요.
- Service Subnet명 Load Balancer가 생성된 Service Subnet에 LB 서버 그룹을 | div.dropdown "선택하세요." | 선택하세요.
- 부하 분산 부하 분산 알고리즘을 선택합니다. Weighted 부하 분산을 사용할 경우, 멤버 가중치에 비례하 | div.dropdown "Round Robin" | Round Robin
- 프로토콜 UDP 프로토콜을 설정할 경우, UDP 프로토콜을 사용하는 Listener에만 연결할 수 있습니다. | div.dropdown "TCP" | TCP
- LB 헬스 체크 LB 서버 그룹과 동일한 Service Subnet에 생성된 LB 헬스 체크를 선택할 수 있 | div.dropdown "선택하세요." | 선택하세요.
- LB 서버 그룹 멤버의 Security Group에 서버 연결을 위한 규칙을 추가해야 합니다. (방향) In | (컨트롤 없음) | 
- 설명 | textarea[textarea] | 255자 이내로 입력하세요. 0/255
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
  dropdown "VPC명": ["vpc-0923-1738-196a"]
  dropdown "부하": ["Round Robin","Weighted Round Robin","Least Connection","Weighted Least Connection","Source IP/Port Hash","Source IP Hash"]
  dropdown "프로토콜": ["TCP","UDP"]
