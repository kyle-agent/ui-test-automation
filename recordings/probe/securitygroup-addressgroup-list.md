# #/securitygroup/addressgroup/list
title: Address Group 목록 | Security Group | kr-west1 | Console
list buttons: ["삭제(dis)","상세 검색","Address Group 생성","Address Group 생성"]
headers:  | Address | Group명 | Address | Group | ID | 대상 | 주소 | 수 | (총 | 0개) | 설명 | 
rows: 0

## "Address Group 생성" → /securitygroup/addressgroup/request — Address Group 생성 | Security Group | kr-west1 | Console
- Address Group명 | input[text] | 영문 또는 숫자로 시작하며 영문, 숫자와 특수문자(-또는_)를 사용하여 100자 이내로 입력하세요. 0/100
- 대상 주소 대상 주소를 CIDR(IP주소/서브넷마스크) 형식으로 입력하세요. ','와 '-'을 사용하여 다수 | textarea[textarea] | ex)172.0.0.0/24, 10.0.0.1, 20.0.0.1-20.0.0.150
- 설명 | textarea[textarea] | 255자 이내로 입력하세요. 0/255
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
