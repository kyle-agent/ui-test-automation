# #/oracleservices/oracle-services
title: Oracle Services 목록 | Oracle Services | kr-west1 | Console
list buttons: ["서비스 해지(dis)","서비스 생성","서비스 생성"]
headers:  | Oracle | Services명 | 서비스 | 접속 | 신청일시 | 상태 | 
rows: 0

## "서비스 생성" → /oracleservices/oracle-services/request — Oracle Services 생성 | Oracle Services | kr-west1 | Console
- Oracle Services명 | input[text] | 영문 소문자로 시작하며 소문자와 숫자, 특수문자(-)를 사용하여 3~30자로 입력하세요. 0/30
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- Tenancy 선택 | (컨트롤 없음) | 새로운 테넌시가 할당됩니다. 서비스를 신청하기 위해선 어카운트가 Organization에 속해있어야 합니다. Organization을 생성하거나, Organization에 가입해주세요.
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
