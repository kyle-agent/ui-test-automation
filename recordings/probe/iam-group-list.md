# #/iam/group/list
title: 사용자 그룹 목록 | Identity and Access Management(IAM) | Global | Console
list buttons: ["삭제(dis)","사용자 그룹 생성","사용자 그룹 생성"]
headers:  | 사용자 | 그룹명 | 사용자 | 연결된 | 정책 | 생성 | 일시 | 수정 | 일시
rows: 0

## "사용자 그룹 생성" → /iam/group/create — 사용자 그룹 생성 | Identity and Access Management(IAM) | Global | Console
- 사용자 그룹명 | input[text] | 한글, 영문, 숫자와 특수문자(+=,.@-_)를 사용하여 3~24자로 입력하세요. 0/24
- 설명 | textarea[textarea] | 1,000자 이내로 입력하세요. 0/1,000
- 사용자 | div.dropdown "10개씩 보기", input[text] ph=정확한 사용자 ID를 입력하세요., div.checkbox | 추가할 사용자를 선택하세요. 총 0 10개씩 보기 정확한 사용자 ID를 입력하세요. 사용자 ID 사용자 그룹 생성 일시 데이터가 없습니다. ※ 추가하려는 사용자가 없는 경우 사용자 생성 페이지에서 사용자를 생성한 후
- 정책 | div.dropdown "10개씩 보기", input[text] ph=정책명을 입력하세요., button[submit] "상세 검색", div.checkbox | 연결할 정책을 선택하세요. 총 33 10개씩 보기 정책명을 입력하세요. 상세 검색 정책명 유형 설명 수정 일시 CloudScopeReadOnlyAccess 기본 CloudScope에서 네트워크 연결성 검증 기능을 수
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["상세 검색","태그 추가","취소","생성(dis)"]
  dropdown "정책": ["5개씩 보기","10개씩 보기","20개씩 보기","30개씩 보기","40개씩 보기","50개씩 보기","100개씩 보기"]
