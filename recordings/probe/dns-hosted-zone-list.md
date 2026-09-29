# #/dns/hosted-zone/list
title: Hosted Zone 목록 | DNS | kr-west1 | Console
list buttons: ["삭제(dis)","상세 검색","Hosted Zone 생성","Hosted Zone 생성"]
headers:  | Hosted | Zone명 | 유형 | Private | DNS명 | 생성 | 일시 | 상태 | 
rows: 0

## "Hosted Zone 생성" → /dns/hosted-zone/request — Hosted Zone 생성 | DNS | kr-west1 | Console
- 용도구분 Private : SCP 내부 접속 가능한 도메인 Public : 외부(인터넷)에서 접속 가능한 도 | button[submit] "Private", button[submit] "Public" | Private Public
- 등록할 Private DNS명 | div.dropdown "선택하세요." | 선택하세요.
- 등록할 Hosted Zone명 | input[text], div.dropdown ".com", button[submit] "사용 가능 여부 조회" | 영문 소문자 또는 숫자로 시작하고 끝나야 하며, 영문 소문자, 숫자 그리고 특수문자(-.)를 사용하여 2~63자로 입력하세요. 특수문자는 연속해서 사용할 수 없으며, Dot(.)는 최대 2회만 사용 가능합니다. .c
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["Private","Public","사용 가능 여부 조회","태그 추가","취소","생성(dis)"]
  dropdown "등록할": []
  dropdown "등록할": []
