# #/vpn/vpn-tunnel/list
title: VPN Tunnel 목록 | VPN | kr-west1 | Console
list buttons: ["상세 검색","VPN Tunnel 생성","VPN Tunnel 생성"]
headers: VPN | Tunnel명 | VPN | Gateway명 | Public | IP | Peer | VPN | GW | IP | Remote | Subnet | 상태
rows: 0

## "VPN Tunnel 생성" → /vpn/vpn-tunnel/request — VPN Tunnel 생성 | VPN | kr-west1 | Console
- VPN Tunnel명 | input[text] | 영문과 숫자를 사용하여 3~20자로 입력하세요. 0/20
-  | (컨트롤 없음) | SCP VPN 서비스는 Passive Mode(Responder 역할)로 운영됩니다. 원격 Peer VPN이 Active 모드로 운영이 필수입니다.
- VPN Gateway명 | div.dropdown "선택하세요." | 선택하세요.
- VPC명 | input[text] | 
- Public IP | input[text] | 
- Peer VPN GW IP 연결할 외부 네트워크의 VPN 게이트웨이 IP 주소를 입력하세요. VPN 게이트웨 | input[text] | ex) 192.168.10.0
- Remote Subnet(CIDR) 연결할 원격지의 서브넷 주소를 입력하세요. CIDR 형식(IP 주소/네트 | input[text], button[submit] "추가" | ex) 20.0.0.0/24 추가
-  | button[submit] "전체 삭제" | 총 0/10 전체 삭제 추가된 IP 대역이 없습니다. 10개 이내의 IP 대역을 추가하세요.
- Pre-shared Key VPN 게이트웨이 간의 IKE 상호 인증에 사용할 공유키(PSK)를 입력하세요.  | input[password] | 8~64자로 입력하세요. 0/64
- 설명 | textarea[textarea] | 40자 이내로 입력하세요. 0/40
- IKE 설정 | div.dropdown "IKE v1", div.dropdown "선택하세요.", div.dropdown "선택하세요.", button[submit] "추가", div.checkbox "32", div.checkbox "31", div.checkbox "30", div.checkbox "29" | IKE Version IKE v1 알고리즘 설정 Encryption Algorithm Digest Algorithm 선택하세요. 선택하세요. 추가 Diffie-Hellman 32 31 30 29 28 27 21 20
- IKE Version | div.dropdown "IKE v1" | IKE v1
- 알고리즘 설정 | div.dropdown "선택하세요.", div.dropdown "선택하세요.", button[submit] "추가" | Encryption Algorithm Digest Algorithm 선택하세요. 선택하세요. 추가
- Diffie-Hellman | div.checkbox "32", div.checkbox "31", div.checkbox "30", div.checkbox "29", div.checkbox "28", div.checkbox "27", div.checkbox "21", div.checkbox "20" | 32 31 30 29 28 27 21 20 19 18 17 16 15 14 5 2 1
- SA LifeTime SA(Security Association)의 세션 만료 시간입니다. 120초~172, | input[text] | 초
- IPSEC 설정 | div.dropdown "선택하세요.", div.dropdown "선택하세요.", button[submit] "추가", div.checkbox "사용", div.checkbox "32", div.checkbox "31", div.checkbox "30", div.checkbox "29" | 알고리즘 설정 Encryption Algorithm Digest Algorithm 선택하세요. 선택하세요. 추가 Perfect Forward Secrecy(PFS) 사용 Diffie-Hellman 32 31 30 2
- 알고리즘 설정 | div.dropdown "선택하세요.", div.dropdown "선택하세요.", button[submit] "추가" | Encryption Algorithm Digest Algorithm 선택하세요. 선택하세요. 추가
- Perfect Forward Secrecy(PFS) | div.checkbox "사용" | 사용
- Diffie-Hellman | div.checkbox "32", div.checkbox "31", div.checkbox "30", div.checkbox "29", div.checkbox "28", div.checkbox "27", div.checkbox "21", div.checkbox "20" | 32 31 30 29 28 27 21 20 19 18 17 16 15 14 5 2 1
- SA LifeTime SA(Security Association)의 세션 만료 시간입니다. 120초~172, | input[text] | 초
- DPD Probe Interval | input[text] | 초
- 태그 | button[submit] "태그 추가" | 태그 추가 50개 태그를 더 추가할 수 있습니다. (최대 50개)
buttons: ["추가(dis)","전체 삭제(dis)","추가(dis)","추가(dis)","태그 추가","취소","생성(dis)"]
  dropdown "VPN": []
  dropdown "IKE": ["IKE v1","IKE v2"]
  dropdown "IKE": ["IKE v1","IKE v2"]
  dropdown "알고리즘": ["des","3des","aes128","aes192","aes256","aria128","aria192","aria256","seed"]
  dropdown "IPSEC": ["null","des","3des","aes128","aes192","aes256","aria128","aria192","aria256","seed","aes128gcm","aes256gcm","chacha20poly1305"]
  dropdown "알고리즘": ["des","3des","aes128","aes192","aes256","aria128","aria192","aria256","seed"]
