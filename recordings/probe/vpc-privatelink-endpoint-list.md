# #/vpc/privatelink-endpoint/list
title: PrivateLink Endpoint 목록 | VPC | kr-west1 | Console
list buttons: ["삭제(dis)","상세 검색","PrivateLink Endpoint 생성","PrivateLink Endpoint 생성"]
headers:  | PrivateLink | Endpoint명 | 서비스 | 구분 | PrivateLink | Endpoint | IP | PrivateLink | Service명 | PrivateLink | Service | ID | 생성 | 일시 | 상태 | 
rows: 0

## "PrivateLink Endpoint 생성" → /vpc/privatelink-endpoint/request — PrivateLink Endpoint 생성 | VPC | kr-west1 | Console
- PrivateLink Endpoint명 | input[text] | 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요. 단, 특수문자(-)로 시작할 수 없습니다. 0/20
- VPC명 | div.dropdown "선택하세요." | 선택하세요.
- Subnet명 | div.dropdown "선택하세요." | 선택하세요.
- PrivateLink Endpoint IP Subnet 선택하여 대역 내에서 사용자가 입력 가능합니다. Su | input[text] | ex) 192.168.0.10
- 서비스 구분 | button[submit] "Samsung Cloud Platform 제공 서비스", button[submit] "기타 PrivateLink 서비스" | Samsung Cloud Platform 제공 서비스 기타 PrivateLink 서비스
-  | div.dropdown "선택하세요." | PrivateLink Service명 연결을 희망하는 PrivateLink Service를 선택하세요. 선택하세요.
- PrivateLink Service명 연결을 희망하는 PrivateLink Service를 선택하세요. | div.dropdown "선택하세요." | 선택하세요.
- Security Group | button[submit] "선택" | 선택 5개 이내의 Security Group을 선택하세요. 0/5 개
-  | (컨트롤 없음) | Security Group을 설정하지 않으면 기본적으로 모든 접속을 차단합니다. 필요한 접속을 허용하기 위해서 Security Group을 설정해주세요.
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["Samsung Cloud Platform 제공 서비스","기타 PrivateLink 서비스","선택","태그 추가","요금 확인","취소","생성(dis)"]
  dropdown "VPC명": []
  dropdown "": ["OpenAPI","ServiceWatch"]
  dropdown "PrivateLink": ["OpenAPI","ServiceWatch"]
