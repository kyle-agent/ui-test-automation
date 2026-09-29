# #/virtualserver/auto-scaling-group/detail/info?autoScalingGroupId=… — 정책·스케줄·알림 (2026-09-29 프로브, 에이전트 C)
- 목록 이름 셀 링크는 getByText(name, exact) 로 안 잡힌다(부분 일치로 잡음). 상단 "Auto-Scaling Group 삭제".
- 탭: 상세 정보 | 정책 (n) | 스케줄 (n) | Virtual Server | Load Balancer (n) | 알림 (n) | 태그 (n) | 작업 이력. 탭 라우트 …/detail/policy, /schedule, /notification

## 정책 (0): 표 위 "삭제"(행 선택 후)·"정책 추가". 열 구분 | 정책명 | 실행 조건 | 실행 단위 | 쿨다운 | 상태
"정책 추가" 모달:
- 구분 | button "Scale Out", button "Scale In"
- 정책명 | input[text] | 영문, 숫자와 특수문자(-_) 63자
- 실행 조건 | dropdown Statistic ["Average","Min","Max"], Metric Type ["CPU Usage","Network In(Bytes)","Network Out(Bytes)","Network In(Packets)","Network Out(Packets)"], Operator [">=",">","<=","<"], Threshold input 60 %, Period ["5".."60"] 분 동안 발생
- 실행 단위 | dropdown ["지정 대수만큼 서버 수 증감","비율로 서버 수 증감","서버 수 고정"], input 1 "대수로 증가"
- 쿨다운 | input 300 초
buttons ["Scale Out","Scale In","취소","확인(dis)"] → 이름 입력 후 활성 → "정책을 추가하시겠습니까?" → "정책 생성이 성공하였습니다." 행 "Scale Out pol-… Average CPU Usage >= 60% 5분 동안 발생. 지정 대수만큼 서버 수 증감 1대수로 증가 300초 Active"
삭제: 행 선택 → "삭제" → "정책 1개를 삭제하시겠습니까?" → "정책 (0)"

## 스케줄 (0): 열 스케줄명 | Min | Desired | Max | 주기 | 날짜/요일 | 수행 시간 | 시간대 | 상태
"스케줄 추가" 모달:
- 스케줄명 | input[text] 63자
- 서버 수 | checkbox(on) Min / Desired / Max + input 3칸
- 주기 | dropdown ["매일","매주","매달","한 번"]
- 시작일 / 종료일 | input YYYY-MM-DD (기본 오늘 / +7일), checkbox "영구"
- 시간 | dropdown 시(현재+1) : ["00","30"]
- 시간대 | dropdown Asia/Seoul
→ "스케줄을 추가하시겠습니까? 수행 시간이 중복된 스케줄이 있는 경우…" → "스케줄 생성이 성공하였습니다." 행 Active. 삭제 "스케줄 1개를 삭제하시겠습니까?"

## 알림 (0): 열 알림 수신자 | 서버 생성(성공/실패) | 서버 해지(성공/실패) | 정책 실행조건 만족 시 | 상태
"알림 추가" 모달: 통보 시점 체크 5개(서버 생성·서버 해지·서버 생성 실패·서버 해지 실패·정책 실행조건 만족 시), "알림 수신자 추가" → 두 번째 모달
"알림 수신자 추가": "로그인 이력이 있는 사용자(이메일, 휴대전화 번호 등록 사용자)만 추가할 수 있습니다." 주소록 | Account 멤버 (0) → 후보 없음 → 확인 비활성. **알림은 만들 수 없다(이 계정)**.
