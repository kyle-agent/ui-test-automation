# #/loggingaudit/trail
title: Trail 목록 | Logging&Audit | kr-west1 | Console
list buttons: ["상세 검색","Trail 생성","Trail 생성"]
headers: Trail명 | 유형 | 대상 | 자원 | 유형 | 대상 | 사용자 | 대상 | 리전 | 저장 | 버킷 | 최종 | 실행 | 결과 | 생성 | 일시 | 상태
rows: 0

## "Trail 생성" → /loggingaudit/trail/create — Trail 생성 | Logging&Audit | kr-west1 | Console
- Trail명 | input[text] | 영문, 숫자와 특수문자(-)를 사용하여 5~26자로 입력하세요. 0/26
- 대상 리전 | div.dropdown "전체" | 전체
- 대상 자원 유형 | input[text], button[submit] "선택" | 선택
- 대상 사용자 | input[text], button[submit] "선택" | 선택
- 저장 버킷 리전 | div.dropdown "한국 서부1" | 한국 서부1
- 저장 버킷 Trail을 생성하는 리전에 Object Storage 버킷이 존재해야 합니다. 버킷이 없을 경우 | div.dropdown "선택하세요." | 선택하세요.
- 저장 형식 Log를 버킷에 저장하는 파일 형식을 지정합니다. | button[submit] "JSON", button[submit] "CSV" | JSON CSV
- 로그파일 검증 Trail 로그파일의 변경 및 삭제 여부를 검증하기 위해 동일한 버킷에 Digest 파일을 저 | div.checkbox "사용" | 사용
- ServiceWatch 로그 수집 정보 Trail 로그를 ServiceWatch의 로그 그룹으로 전송하도록  | div.checkbox "사용" | 사용
- 설명 | textarea[textarea] | 0/400
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["선택","선택","JSON","CSV","태그 추가","취소","생성(dis)"]
  dropdown "대상": ["전체","한국 서부1"]
  dropdown "저장": ["한국 동부1","한국 서부1"]
  dropdown "저장": ["한국 동부1","한국 서부1"]
