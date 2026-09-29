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

## 2026-09-29 실측 (에이전트 A, 생성·연결·해제·삭제)
- 권한 설정 단계 "정책 불러오기" 모달(기존 33개 정책 표, 행 선택 i.table-select) → 확인 → "기존에 입력한 내용은 모두 삭제되고 … 대체됩니다" 확인 → 로딩 수 초 →
  Allow · Billing Plan 블록(List 24/25, Read 35/40) + "액션 직접 추가" 버튼 → "다음" 활성. (JSON·기본 모드 직접 입력의 어려움은 HANDOFF 9.9)
- 다음 → "JSON 모드로 변경하거나 화면 이동 시 …" 안내 모달(생성 과정 중 1회) → 입력 정보 확인 → "생성" → "정책을 생성하시겠습니까?".
- 사용자 그룹 목록의 그룹명은 span[role=button](링크 아님), 상세 탭 "정책 (n)" → "정책 연결" 화면 #/iam/group/<id>/policies/update:
  정책명 검색(placeholder "정책명을 입력하세요.") → 행 선택 → "완료" → "정책을 연결하시겠습니까?".
- 해제: 정책 탭 행 선택 → "연결 해제" → "정책을 연결 해제하시겠습니까?". 그룹 삭제는 상세 "사용자 그룹 삭제" 또는 목록 행 선택 "삭제".
