# #/dns/private-dns/list
title: Private DNS 목록 | DNS | kr-west1 | Console
list buttons: ["활성화(dis)","","서비스 생성","서비스 생성"]
headers:  | Private | DNS명 | 최초 | 생성 | 위치 | 상태 | 
rows: 0

## "서비스 생성" → /dns/private-dns/request — Private DNS 신청 | DNS | kr-west1 | Console
- Private DNS명 Private DNS명은 어카운트 내 모든 위치에서 공통으로 사용됩니다. | input[text] | 소문자,숫자와 특수문자(-)를 포함하여 3~20자로 입력하세요. 0/20
- VPC 연결 Private DNS는 연결된 VPC에 대해 적용됩니다. | button[submit] "선택" | 선택 데이터가 없습니다. 0/10 대
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["선택","태그 추가","취소","생성(dis)"]
