# #/configinspection/configinspection/list
title: Config Inspection 목록 | Config Inspection | kr-west1 | Console
list buttons: ["상세 검색","서비스 생성","서비스 생성"]
headers: 진단 | 유형 | 클라우드 | 진단명 | 체크 | 리스트 | 버전 | 버전 | 상태 | 진단 | 계정 | 최근 | 진단 | 일시 | 진단 | 상태
rows: 0

## "서비스 생성" → /configinspection/configinspection/request — Config Inspection 생성 | Config Inspection | kr-west1 | Console
- 진단 유형 | (컨트롤 없음) | Console
- 클라우드 | button[submit] "SCP", button[submit] "AWS", button[submit] "Azure" | SCP AWS Azure
- 진단 대상 | input[text], div.dropdown "선택하세요." | 진단명 영문, 숫자와 특수문자(-,_)를 사용하여 25자 이내로 입력하세요. 0/25 진단 계정 선택하세요.
- 체크 리스트 | div.dropdown "선택하세요." | 선택하세요.
- 버전 | div.dropdown "선택하세요." | 선택하세요.
- 진단 스케줄 • 진단 스케줄은 서비스 생성 이후 수정 가능합니다. 매월 특정일 선택 시 해당 일자가 없는 달 | div.checkbox "사용" | 사용
- 인증키 | input[text], button[submit] "선택" | 인증키를 선택하세요. 선택
- 요금제 • 일반 요금제는 진단횟수에 따라 요금이 청구되며, 월정액을 선택하는 경우 진단횟수에 관계없이 일정  | button[submit] "일반", button[submit] "월정액" | 일반 월정액
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["SCP","AWS","Azure","선택","일반","월정액","태그 추가","요금 확인","취소","생성(dis)"]
  dropdown "진단": ["17e64223988b41469a6562e4ffca9bc4"]
  dropdown "체크": ["Best Practice","SSI"]
