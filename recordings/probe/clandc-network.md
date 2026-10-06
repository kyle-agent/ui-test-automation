# #/clandc/network
title: Cloud LAN Network 목록 | Cloud LAN-Data Center | Global | Console
list buttons: ["서비스 해지(dis)","서비스 생성","서비스 생성"]
headers:  | Cloud | LAN | Network명 | Cloud | LAN | Network | ID | vDevice | 수 | Cloud | LAN | Network | 위치 | 생성 | 일시 | 상태 | 
rows: 0

## "서비스 생성" → /clandc/network/new — Cloud LAN Network 생성 | Cloud LAN-Data Center | Global | Console
- Cloud LAN Network명 | input[text] | 영문, 숫자와 특수문자(_-)를 사용하여 3~21자로 입력하세요. 0/21
- Cloud LAN Network 위치 | div.dropdown "선택하세요." | 선택하세요.
- 설명 | textarea[textarea] | 50자 이내로 입력하세요. 0/50
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
  dropdown "Cloud": ["SA-EAST-1"]
