# #/iam/policy/list
title: 정책 목록 | Identity and Access Management(IAM) | Global | Console
list buttons: ["삭제(dis)","상세 검색","정책 생성"]
headers:  | 정책명 | 유형 | 설명 | 생성 | 일시 | 수정 | 일시
rows: 20 예: CloudScopeReadOnlyAccess 기본 CloudScope에서 네트워크 연결성 검증 기능을 수행하기 위한 권한 2026-09-15 19:17:15 2026-09-15 1
row buttons: [] select icon: 1

## "정책 생성" → /iam/policy/create — 정책 생성 | Identity and Access Management(IAM) | Global | Console
- 정책명 | input[text] | 한글, 영문, 숫자와 특수문자(+=,.@-_)를 사용하여 3~128자로 입력하세요. 0/128
- 설명 | textarea[textarea] | 1,000자 이내로 입력하세요. 0/1,000
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["태그 추가","취소","다음(dis)"]
