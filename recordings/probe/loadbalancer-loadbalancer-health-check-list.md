# #/loadbalancer/loadbalancer-health-check/list
title: LB 헬스 체크 목록 | Load Balancer | kr-west1 | Console
list buttons: ["삭제(dis)","상세 검색","LB 헬스 체크 생성","삭제","삭제","삭제","삭제","삭제"]
headers:  | LB | 헬스 | 체크명 | Service | Subnet | ID | LB | 서버 | 그룹 | 수 | 유형 | 프로토콜 | 생성 | 일시 | 상태 | 
rows: 5 예: HTTP_Default - 0개 기본 HTTP 2025-06-27 16:11:31 Active 삭제
row buttons: ["삭제"] select icon: 1

## "LB 헬스 체크 생성" → /loadbalancer/loadbalancer-health-check/request — LB 헬스 체크 생성 | Load Balancer | kr-west1 | Console
- LB 헬스 체크명 | input[text] | 영문, 숫자와 특수문자(-_)를 사용하여 3~63자 이내로 입력하세요. 0/63
- VPC명 | div.dropdown "선택하세요." | 선택하세요.
- Service Subnet명 Load Balancer가 생성된 Service Subnet에 LB 헬스 체크를 | div.dropdown "선택하세요." | 선택하세요.
- 헬스 체크 방식 | div.dropdown "TCP", div.dropdown "멤버 포트", input[text], input[text], input[text] | 프로토콜 TCP 헬스 체크 포트 멤버 포트 주기 초 대기 시간 대기 시간은 주기 보다 큰 값으로 설정할 수 없습니다. 초 탐지 횟수 탐지 횟수를 기준으로 헬스 체크 상태를 판단합니다. 회
- 프로토콜 | div.dropdown "TCP" | TCP
- 헬스 체크 포트 | div.dropdown "멤버 포트" | 멤버 포트
- 주기 | input[text] | 초
- 대기 시간 대기 시간은 주기 보다 큰 값으로 설정할 수 없습니다. | input[text] | 초
- 탐지 횟수 탐지 횟수를 기준으로 헬스 체크 상태를 판단합니다. | input[text] | 회
- LB 서버 그룹 멤버의 Security Group에 헬스 체크를 위한 규칙을 추가해야 합니다. (방향) In | (컨트롤 없음) | 
- 설명 | textarea[textarea] | 255자 이내로 입력하세요. 0/255
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
  dropdown "VPC명": ["vpc-0923-1738-196a"]
  dropdown "헬스": ["멤버 포트","직접 입력"]
  dropdown "프로토콜": ["TCP","HTTP","HTTPS"]
  dropdown "헬스": ["멤버 포트","직접 입력"]
