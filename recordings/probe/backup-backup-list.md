# #/backup/backup/list
title: Backup 목록 | Backup | kr-west1 | Console
list buttons: ["서비스 해지(dis)","상세 검색","서비스 생성","서비스 생성"]
headers:  | Backup명 | 구분 | Backup | 유형 | Backup | 대상 | 생성 | 일시 | 상태 | 
rows: 0

## "서비스 생성" → /backup/backup/request — Backup 생성 | Backup | kr-west1 | Console
- Backup명 | input[text] | 영문과 숫자를 사용하여 3~30자로 입력하세요. 0/30
- Backup 유형 정보 Backup 대상 서버에 Agent 구성이 필요합니다. Backup Agent 생성  | div.dropdown "Agent", div.dropdown "Filesystem" | Agent Filesystem
- Availability Zone | div.dropdown "kr-west1-b" | kr-west1-b
- Backup 대상 | input[text], button[submit] "대상 선택" | 대상 선택
- Backup 복제 | div.checkbox "사용" | 사용
- Filesystem File Storage 볼륨은 Backup이 불가하므로 추가된 File Storage는  | div.checkbox "전체", input[text], button[submit] "대상 추가" | 전체 Filesystem명* OS에서 사용 중인 Filesystem을 정확히 입력하세요. (ex. Linux - /data, Windows - C:\) 잘못된 Filesystem명이나 아래 특수 문자를 포함한 경우,
- 암호화 약 20~30%의 성능 저하가 발생하며 생성 후 수정이 불가합니다. | div.checkbox "사용" | 사용
- 보관 기간 | div.dropdown "2주(14일)" | 2주(14일)
- 스케줄 정보 Full Backup 1개, Incremental Backup 최대 6개 설정 가능합니다. | button[submit], div.dropdown "Full", div.dropdown "매주", div.dropdown "월", div.dropdown "선택하세요.", div.dropdown "00", button[submit] "추가" | Full 주기* 매주 월 시작 시간* 선택하세요. : 00 추가 시간대: Asia/Seoul (GMT +09:00)
-  | button[submit], div.dropdown "Full", div.dropdown "매주", div.dropdown "월", div.dropdown "선택하세요.", div.dropdown "00" | Full 주기* 매주 월 시작 시간* 선택하세요. : 00
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["대상 선택","대상 추가(dis)","(dis)","추가","태그 추가","취소","생성(dis)"]
  dropdown "Backup": ["Agent"]
  dropdown "Availability": ["kr-west1-b"]
  dropdown "보관": ["2주(14일)","1개월(31일)","3개월(93일)","6개월(186일)","1년(365일)"]
  dropdown "": ["kr-west1-b"]
