# #/network-logging/firewall-logging/list (2026-09-29, 에이전트 A)
메뉴: Firewall Logging · Security Group Logging · NAT Logging (같은 구조)
- 화면 위 "로그 저장소" 드롭다운(기본 "미사용" + 이 리전의 Object Storage 버킷들) + "적용"(값이 바뀌어야 활성) + 현재 값 표시.
- 표: 자원 ID | 저장 대상 | 저장 등록 일시 (로그 저장을 켠 Firewall/SG/NAT).
- 버킷 선택 → 적용 → "로그 저장소를 수정하시겠습니까? … 로그 저장 여부를 '사용'으로 설정하셔야 실제 로그 수집" → 현재 값 "<버킷>/LOG/FW".
- 미사용 → 적용 → "로그 저장소 사용을 해제하시겠습니까?" → "미사용". 설정만으로는 버킷에 파일이 생기지 않아 빈 버킷 해지가 된다.
- 버킷이 없으면 드롭다운에 "미사용" 뿐. API lifecycle 의 network-logging storage 가 콘솔에선 이 설정이다(이름 있는 자원 아님).
- Security Group Logging 저장소를 설정하면 SG 폼 "로그 저장 여부" 기본값에 영향이 있으므로 spec 은 Firewall Logging 을 쓴다.
