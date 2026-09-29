# #/iam/role
title: 역할 목록 | Identity and Access Management(IAM) | Global | Console
list buttons: ["삭제(dis)","역할 생성","1"]
headers:  | 역할명 | 유형 | 설명 | 연결된 | 정책 | 생성 | 일시 | 수정 | 일시
rows: 1 예: OrganizationAccountAccessRole 서비스 - 1 2026-09-21 12:29:37 2026-09-21 12:29:37
row buttons: ["1"] select icon: 1

## "역할 생성" → /iam/role/create — 역할 생성 | Identity and Access Management(IAM) | Global | Console
- 역할명 | input[text] | 영문, 숫자와 특수문자(+=,.@-_)를 사용하여 64자 이내로 입력하세요. 0/64
- 설명 | textarea[textarea] | 1,000자 이내로 입력하세요. 0/1,000
- 최대 세션 지속 시간 | div.dropdown "1시간" | Console에서 역할을 전환하는 IAM 사용자에게 허용되는 역할 세션 기간을 설정할 수 있습니다. 1시간
- 수행 주체 | div.dropdown "선택하세요.", input[text], button[submit] "추가" | 구분 Value 선택하세요. 추가 19개 수행 주체를 더 추가할 수 있습니다. (최대 20개)
- 구분 | (컨트롤 없음) | Value
- Value | (컨트롤 없음) | 
- 정책 | div.dropdown "10개씩 보기", input[text] ph=정책명을 입력하세요., button[submit] "상세 검색", div.checkbox | 연결할 정책을 선택하세요. 총 33 10개씩 보기 정책명을 입력하세요. 상세 검색 정책명 유형 설명 수정 일시 CloudScopeReadOnlyAccess 기본 CloudScope에서 네트워크 연결성 검증 기능을 수
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["추가","상세 검색","태그 추가","취소","생성(dis)"]
  dropdown "최대": ["1시간","2시간","4시간","8시간","12시간","직접 입력"]
  dropdown "수행": ["현재 Account","다른 Account","사용자 SRN","자격 증명 공급자","서비스"]
  dropdown "정책": ["5개씩 보기","10개씩 보기","20개씩 보기","30개씩 보기","40개씩 보기","50개씩 보기","100개씩 보기"]
