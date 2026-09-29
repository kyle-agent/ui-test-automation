# #/vpc/vpc-endpoint/list
title: VPC Endpoint 목록 | VPC | kr-west1 | Console
list buttons: ["삭제(dis)","상세 검색","VPC Endpoint 생성","VPC Endpoint 생성"]
headers:  | VPC | Endpoint명 | VPC명 | 사용 | 용도 | VPC | Endpoint | IP | 생성 | 일시 | 상태 | 
rows: 0

## "VPC Endpoint 생성" → /vpc/vpc-endpoint/request — VPC Endpoint 생성 | VPC | kr-west1 | Console
- VPC명 | div.dropdown "선택하세요." | 선택하세요.
- 사용 용도 | div.dropdown "선택하세요.", div.dropdown "선택하세요." | 대상 서비스 정보 선택하세요. 연결 자원 각 서비스의 서버 접근 제어 설정에서 Endpoint에 대한 접근 제어 추가 설정이 필요합니다. 선택하세요.
- 대상 서비스 정보 | div.dropdown "선택하세요." | 선택하세요.
- 연결 자원 각 서비스의 서버 접근 제어 설정에서 Endpoint에 대한 접근 제어 추가 설정이 필요합니다. | div.dropdown "선택하세요." | 선택하세요.
- VPC Endpoint명 | input[text] | 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요. 0/20
- VPC Endpoint IP | div.dropdown "선택하세요.", input[text] | Subnet명 선택하세요. IP Subnet을 선택하여 대역내에서 사용자가 입력 가능합니다. Subnet 내 사용중인 IP 주소와 중복되지 않아야 합니다. Subnet IP 대역의 첫 번째, 마지막 IP는 사용할 수
- Subnet명 | div.dropdown "선택하세요." | 선택하세요.
- IP Subnet을 선택하여 대역내에서 사용자가 입력 가능합니다. Subnet 내 사용중인 IP 주소와 중복 | input[text] | 범위 내로 입력하세요.
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","요금 확인","취소","생성(dis)"]
  dropdown "VPC명": ["vpc-0929-1700-b001 AZ: kr-west1-b"]
  dropdown "VPC": ["vpc-0929-1700-b001 AZ: kr-west1-b"]
