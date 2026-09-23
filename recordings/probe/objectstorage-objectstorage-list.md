# #/objectstorage/objectstorage/list
title: Object Storage 목록 | Object Storage | kr-west1 | Console
list buttons: ["서비스 해지(dis)","상세 검색","서비스 생성","서비스 생성"]
headers:  | 버킷명 | 
rows: 0

## "서비스 생성" → /objectstorage/objectstorage/request — Object Storage 생성 | Object Storage | kr-west1 | Console
- 버킷명 | input[text] | 영문 소문자 또는 숫자로 시작하며 소문자, 숫자와 특수문자(-.)를 사용하여 3~63자로 입력하세요. - 마침표가 2개 이상 연속될 수 없습니다. - 마침표와 대시는 인접할 수 없습니다. - 마침표나 대시로 끝날 수
-  | (컨트롤 없음) | 버킷 생성 후, 안전한 데이터 관리를 위해 암호화와 버전 관리를 반드시 설정하세요. Object Storage 서비스를 사용하려면 인증키를 생성해야 합니다.  인증키 관리 바로가기 인증키의 기간이 만료되면 Objec
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
