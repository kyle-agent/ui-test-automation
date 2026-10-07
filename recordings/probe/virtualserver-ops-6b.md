# Virtual Server · Block Storage · ASG · Event Streams 쓰기 동작 프로브 (2026-10-07, 6차 에이전트 6B)

화면 요청 경로는 `src/console/api-log.ts`(메서드·경로만, 본문 없음) 로그로 확인했다.

## Block Storage 상세 (compute.volume-snapshot)
- 연필 라벨: 볼륨명 · 용량(증설만, Units 입력, "수십 분" 안내) · Max IOPS · Max Throughput(SSD_Provisioned 만). 생성 폼의 SSD_Provisioned 는 5,000 IOPS / 250 MB/s 가 미리 채워져 있다.
- 볼륨명 → PUT /volumes/{id} ("볼륨을 수정하시겠습니까?"), QoS → PUT /volumes/{id}/qos (입력칸이 "6,000" 처럼 쉼표로 다시 그려짐), 용량 → PUT /volumes/{id}/size.
- 스냅샷 탭 행 끝 i.menu-icon 메뉴: 복구 볼륨 생성 · 수정 · 삭제. "수정" 모달(스냅샷명·설명) → PUT /snapshots/{id}.

## 서버 상세 (compute.vm-stack-net · compute.vm-volume)
- 상단: 시작 · 중지 · 재시작 · Image 생성 · 콘솔 로그 · Dump 생성 · ⋮(Rebuild · 연결 해제) · 서비스 해지.
- 재시작 → POST /servers/{id}/reboot (Rebooting → Active). Rebuild → "Virtual Server를 Rebuild 하시겠습니까?" → POST /servers/{id}/rebuild (Rebuilding → Rebuild Spawning → Active, 이미지 선택 없음).
- 서버 타입 연필(중지 상태): 드롭다운 2단(Standard-1 / s1v2m4 …) → "서버가 재시작됩니다. 서버 타입을 수정하시겠습니까?" → POST /servers/{id}/server-type → Resize Finish → Verify Resize → Stopped(잠시 "시작" 비활성).
- IP 연필: Subnet 드롭다운 + IP 입력, "적용을 위해 서버 재부팅이 실행" → PUT /servers/{id}/interfaces/{id}.
- Public NAT IP 해제 → DELETE /servers/{id}/interfaces/{id}/static-nats/{id}.
- Block Storage 절: 연결 "추가" → POST /servers/{id}/volumes, 분리 → DELETE /servers/{id}/volumes/{id}. "Delete on termination 수정" 은 볼륨 행을 선택해야 활성 → 모달 체크 "사용" → PUT /servers/{id}/volumes/{id}.

## Auto-Scaling Group 상세 (compute.auto-scaling-group)
- 연필: Launch Configuration명 · 서버 수(Min/Desired/Max) · Desired 서버 수 수동 설정 · Security Group명 · 상태 체크(VM·LB 상태 확인, 유예 기간).
- 서버 수 → PUT /auto-scaling-groups/{id}/server-count, 상태 체크 → PUT /auto-scaling-groups/{id}.
- 정책·스케줄 행 메뉴: 수정 · 활성화 · 비활성화. 수정 → PUT …/policies/{id}, …/schedules/{id}. 행 innerText 는 칸 사이 공백이 없다.

## Event Streams 상세 (data-analytics.event-streams)
- 상단: 시작 · 중지 · 재시작 · 서비스 상태 동기화 · Parameter 관리 · 서비스 해지 (Parameter 관리는 더보기 메뉴가 아니라 상단 버튼).
- 연필: Image 버전 · 유지 관리 기간 · ServiceWatch 로그 수집 · IP 접근 제어. 서버 타입은 "Zookeeper & Broker 리소스 현황" 표(미프로브).
