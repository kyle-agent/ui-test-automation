# #/vpc/privatelink-service/list
title: PrivateLink Service 목록 | VPC | kr-west1 | Console
list buttons: ["삭제(dis)","상세 검색","PrivateLink Service 생성","PrivateLink Service 생성"]
headers:  | PrivateLink | Service명 | PrivateLink | Service | IP | 연결 | 자원 | 유형 | 연결 | 자원명 | 생성 | 일시 | 상태 | 
rows: 0

## "PrivateLink Service 생성" → /vpc/privatelink-service/request — PrivateLink Service 생성 | VPC | kr-west1 | Console
- PrivateLink Service명 | input[text] | 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요. 단, 특수문자(-)로 시작할 수 없습니다. 0/20
- 승인 방식 승인 방식을 선택한 이후에는 수정이 불가능합니다. 자동: PrivateLink Service 연결 | button[submit] "자동", button[submit] "수동" | 자동 수동
- VPC명 | div.dropdown "선택하세요." | 선택하세요.
- Subnet명 | div.dropdown "선택하세요." | 선택하세요.
- PrivateLink Service IP Subnet 선택하여 대역 내에서 사용자가 입력 가능합니다. Sub | input[text] | ex) 192.168.0.10
- 연결 자원 Local Subnet을 사용할 경우, LB는 선택할 수 없습니다. IP는 동일 VPC내 Comp | button[submit] "Load Balancer", button[submit] "IP" | Load Balancer IP
-  | div.dropdown "선택하세요." | Load Balancer명 선택하세요.
- Load Balancer명 | div.dropdown "선택하세요." | 선택하세요.
- Security Group | button[submit] "선택" | 선택 5개 이내의 Security Group을 선택하세요. 0/5 개
-  | (컨트롤 없음) | Security Group을 설정하지 않으면 기본적으로 모든 접속을 차단합니다. 필요한 접속을 허용하기 위해서 Security Group을 설정해주세요.
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["자동","수동","Load Balancer","IP","선택","태그 추가","취소","생성(dis)"]
  dropdown "VPC명": []
  dropdown "": []
