# #/virtualserver/server-group/list
title: Server Group 목록 | Virtual Server | kr-west1 | Console
list buttons: ["삭제(dis)","Server Group 생성","Server Group 생성"]
headers:  | Server | Group명 | 정책 | 
rows: 0

## "Server Group 생성" → /virtualserver/server-group/request — Server Group 생성 | Virtual Server | kr-west1 | Console
- Server Group명 | input[text] | 영문, 숫자, 공백과 특수문자(-_)를 사용하여 255자 이내로 입력하세요. 0/255
- 정책 • Server Group은 리전(Region) 단위로 생성되며, 하나의 Server Group을 여러 | div.dropdown "Affinity(근접 배치)" | Affinity(근접 배치)
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
  dropdown "정책": ["Affinity(근접 배치)","Anti-Affinity(분산 배치)","Partition(서버와 Block Storage 분산배치)"]
