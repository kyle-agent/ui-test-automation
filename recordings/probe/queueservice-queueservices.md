# #/queueservice/queueservices
title: Queue 목록 | Queue Service | kr-west1 | Console
list buttons: ["서비스 해지(dis)","상세 검색","서비스 생성","서비스 생성"]
headers:  | Queue명 | 유형 | 대기 | 메시지 | 수 | 암호화 | 생성 | 일시 | 상태 | 
rows: 0

## "서비스 생성" → /queueservice/request — Queue 생성 | Queue Service | kr-west1 | Console
- 유형 기본: 메시지 순서가 유지되지 않습니다. FIFO: 선입선출 메시지를 전송하며, 메시지 순서를 유지합니 | div.dropdown "기본" | 기본
- Queue명 | input[text] | 영문 소문자로 시작하며 소문자, 숫자와 특수문자(-)를 사용하여 3~64자로 입력하세요. 0/64
- 설명 | textarea[textarea] | 100자 이내로 입력하세요. 0/100
- 메시지 크기 | input[text] | 3/3 KB
- 메시지 보존 기간 | input[text], div.dropdown "일" | 1/2 일
- 전송 지연 시간 | input[text], div.dropdown "초" | 1/3 초
- 표시 제한 시간 | input[text], div.dropdown "초" | 2/5 초
- 메시지 수신 대기 시간 | input[text] | 1/2 초
- 암호화 | div.dropdown "사용 안함" | 사용 안함
- 리드라이브 허용 | div.dropdown "모두 차단" | 모두 차단
- 리드라이브 대상 Queue | div.dropdown "사용 안함" | 사용 안함
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","생성(dis)"]
  dropdown "유형": ["기본","FIFO"]
  dropdown "메시지": ["기본","FIFO"]
  dropdown "전송": ["기본","FIFO"]
  dropdown "표시": ["사용 안함","KMS-Managed-Key"]
  dropdown "암호화": ["사용 안함","KMS-Managed-Key"]
  dropdown "리드라이브": ["모두 차단","모두 허용","특정 Queue"]
  dropdown "리드라이브": ["모두 차단","모두 허용","특정 Queue"]
