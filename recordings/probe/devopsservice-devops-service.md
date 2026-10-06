# #/devopsservice/devops-service
title: DevOps Service 목록 | DevOps Service | kr-west1 | Console
list buttons: ["서비스 생성","서비스 생성"]
headers: Tenant명 | Tenant | 코드 | 생성 | 일시 | 상태
rows: 0

## "서비스 생성" → /devopsservice/devops-service/request — DevOps Service 생성 | DevOps Service | kr-west1 | Console
- Tenant명 DevOps Console을 사용하기 위해 Tenant명을 입력하세요. 사용자가 DevOps  | input[text] | 영문 소문자로 시작하며 소문자, 숫자와 특수문자(-)를 사용하여 3~30자로 입력하세요. 0/30
- Tenant 코드 DevOps Console과의 원활한 연계를 위해 사용할 Tenant 코드를 입력하세요.  | input[text] | 영문 소문자로 시작하며 소문자, 숫자와 특수문자(-)를 사용하여 3~30자로 입력하세요. 0/30 DevOps Service는 개발환경에 최적화된 DevOps Console에서 각종 개발도구사용 및 서비스가 가능합니
-  | div.dropdown "10개씩 보기", input[text] ph=검색어를 입력하세요., div.checkbox | 신청자 : kyuh.choi@samsung.com(kyuh.choi@samsung.com) Tenant 멤버 추가 총 0 10개씩 보기 검색어를 입력하세요. 사용자 ID 이메일 마지막 접속 일시 데이터가 없습니다.
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
