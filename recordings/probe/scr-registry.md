# #/scr/registry
title: Registry 목록 | Container Registry | kr-west1 | Console
list buttons: ["서비스 생성","서비스 생성"]
headers: 레지스트리명 | 버킷명 | 가시성 | 생성 | 일시 | 상태
rows: 0

## "서비스 생성" → /scr/registry/request — Registry 생성 | Container Registry | kr-west1 | Console
- 레지스트리명 | input[text] | 영문 소문자로 시작하며 소문자, 숫자를 사용하여 3~25자로 입력하세요. 0/25
- 엔드포인트 레지스트리 엔드포인트에 대한 외부 액세스를 정의합니다. | button[submit] "프라이빗", button[submit] "프라이빗&퍼블릭" | 프라이빗 프라이빗&퍼블릭
- 프라이빗 엔드포인트 접근 제어 사용 설정하면 추가한 리소스의 접근만 허용합니다. 사용 설정하지 않으면 동일  | div.checkbox "사용" | 사용
-  | div.dropdown "5개씩 보기", button[submit] "추가", div.checkbox | 프라이빗 접근 허용 리소스 총 0 5개씩 보기 추가 서비스 리소스명 데이터가 없습니다.
- 프라이빗 접근 허용 리소스 | div.dropdown "5개씩 보기", button[submit] "추가", div.checkbox | 총 0 5개씩 보기 추가 서비스 리소스명 데이터가 없습니다.
- 가시성 레지스트리 내 컨텐츠의 읽기(pull) 작업에 대한 익명 접근을 정의 합니다. | div.checkbox "Public" | Public
-  | (컨트롤 없음) | 이 설정을 사용하면 익명(인증되지 않은) 사용자에게 레지스트리의 모든 컨텐츠에 대한 읽기(anonymous pull) 작업을 허용합니다. 이 설정은 서비스 생성 시에만 사용으로 설정할 수 있습니다.
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["프라이빗","프라이빗&퍼블릭","추가","태그 추가","취소","생성(dis)"]
