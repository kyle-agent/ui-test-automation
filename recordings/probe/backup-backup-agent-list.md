# #/backup/backup-agent/list
title: Backup Agent 목록 | Backup | kr-west1 | Console
list buttons: ["서비스 해지(dis)","상세 검색","서비스 생성","서비스 생성"]
headers:  | Backup | Agent명 | 대상 | 서버 | 생성 | 일시 | 상태 | 
rows: 0

## "서비스 생성" → /backup/backup-agent/request — Backup Agent 생성 | Backup | kr-west1 | Console
- Availability Zone | div.dropdown "kr-west1-b" | kr-west1-b
- 대상 서버 Virtual Server, GPU Server는 1대, Bare Metal Server는 최대  | button[submit] "선택" | 선택 선택된 서버가 없습니다. 0/100대
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["선택","태그 추가","취소","생성(dis)"]
  dropdown "Availability": ["kr-west1-b"]
