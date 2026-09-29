# #/notification/group
title: 알림 그룹 목록 | Notification Manager | Global | Console
list buttons: ["삭제(dis)","","알림 그룹 생성","알림 그룹 생성"]
headers:  | 알림 | 그룹명 | 사용자 | 외부 | 수신자 | 생성 | 일시 | 수정 | 일시
rows: 0

## "알림 그룹 생성" → /notification/group/create — 알림 그룹 생성 | Notification Manager | Global | Console
- 알림 그룹명 정보 | input[text] | 한글, 영문, 숫자와 특수문자(+=,.@-_)를 사용하여 3~24자로 입력하세요. 0/24
- 설명 | textarea[textarea] | 1,000자 이내로 입력하세요. 0/1,000
- 사용자 로그인 이력이 있는 사용자(이메일, 휴대전화 번호 등록 사용자)만 알림 그룹에 추가할 수 있습니다. | div.dropdown "10개씩 보기", input[text] ph=사용자 ID를 입력하세요., div.checkbox | 알림 그룹에 추가할 사용자를 선택하세요. 총 0 10개씩 보기 사용자 ID를 입력하세요. 사용자 ID 생성 일시 마지막 로그인 데이터가 없습니다. ※ 추가하려는 사용자가 없는 경우 사용자 생성 페이지에서 사용자를 생
- 외부 수신자 알림을 수신할 이메일을 직접 입력할 수 있습니다. 이메일을 콤마(,)로 구분하여 입력하세요. ( | textarea[textarea] | ex) sample1@domain.com, sample2@domain.com 0/15,000
buttons: ["취소","생성(dis)"]
