# #/virtualserver/keypair/list
title: Keypair 목록 | Virtual Server | kr-west1 | Console
list buttons: ["삭제(dis)","","Keypair 생성","삭제"]
headers:  | Keypair명 | Keypair | 유형 | 지문 | 
rows: 1 예: qa-shared-keypair SSH b3:f5:d4:2e:7b:7a:59:4e:76:1b:54:a0:f2:f3:bb:cd 삭제
row buttons: ["삭제"] select icon: 1

## "Keypair 생성" → /virtualserver/keypair/request — Keypair 생성 | Virtual Server | kr-west1 | Console
- Keypair명 | input[text] | 영문, 숫자, 공백과 특수문자(-_)를 사용하여 255자 이내로 입력하세요. 0/255
- Keypair 유형 | (컨트롤 없음) | SSH
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
