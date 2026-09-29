# #/vpc/transit-gateway/list
title: Transit Gateway 목록 | VPC | kr-west1 | Console
list buttons: ["삭제(dis)","상세 검색","Transit Gateway 생성","Transit Gateway 생성"]
headers:  | Transit | Gateway명 | 생성 | 일시 | 상태 | 
rows: 0

## "Transit Gateway 생성" → /vpc/transit-gateway/request — Transit Gateway 생성 | VPC | kr-west1 | Console
- Transit Gateway명 | input[text] | 영문, 숫자와 특수문자(-)를 사용하여 3~20자로 입력하세요. 0/20
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","요금 확인","취소","생성(dis)"]
