# Windows 사내 프록시에서 Node 다운로드 오류 해결

증상: `npm install` 이 `reason: CA certificate key too weak` 또는 `self signed certificate in chain` 으로 실패한다.
원인: 프록시가 TLS 를 가로채며 끼워 넣는 CA 인증서의 키가 약해서(RSA 1024 등) Node 24 의 OpenSSL 기본 보안 수준(2)이 거부한다.
브라우저는 Windows 인증서 저장소와 자체 정책을 쓰므로 영향이 없다. 따라서 Node 프로세스에만 다음 두 가지를 준다.

1. OpenSSL 보안 수준을 낮추는 설정 파일
2. Windows 인증서 저장소(사내 루트 CA 포함)를 신뢰 목록으로 사용

## cmd.exe

```bat
(
echo nodejs_conf = openssl_init
echo [openssl_init]
echo ssl_conf = ssl_sect
echo [ssl_sect]
echo system_default = system_default_sect
echo [system_default_sect]
echo CipherString = DEFAULT@SECLEVEL=0
) > C:\jev\node-openssl.cnf

set NODE_OPTIONS=--openssl-config=C:\jev\node-openssl.cnf
set NODE_USE_SYSTEM_CA=1
npm install
```

영구 설정(새 창부터 적용):

```bat
setx NODE_OPTIONS "--openssl-config=C:\jev\node-openssl.cnf"
setx NODE_USE_SYSTEM_CA 1
```

## PowerShell

```powershell
@'
nodejs_conf = openssl_init
[openssl_init]
ssl_conf = ssl_sect
[ssl_sect]
system_default = system_default_sect
[system_default_sect]
CipherString = DEFAULT@SECLEVEL=0
'@ | Set-Content -Encoding ascii C:\jev\node-openssl.cnf

$env:NODE_OPTIONS = "--openssl-config=C:\jev\node-openssl.cnf"
$env:NODE_USE_SYSTEM_CA = "1"
npm install
```

## 그래도 안 될 때

- `self signed certificate in chain` 만 남으면 사내 루트 CA 가 Windows 저장소에 없는 것이다. 브라우저 주소창 자물쇠에서 루트 CA 를
  Base64 `.cer` 로 내보내고 `set NODE_EXTRA_CA_CERTS=C:\path\corp-root-ca.cer` 를 추가한다.
- 프록시 주소를 명시해야 하는 환경이면 `set HTTPS_PROXY=http://proxy.host:port` 를 함께 준다.
- 브라우저 다운로드(`npx playwright install`)가 여전히 막히면 `.env` 에 `PW_CHANNEL=msedge` 를 넣고 설치된 Edge 를 쓴다.
- `npm config set strict-ssl false` 는 인증서 검증을 아예 끄므로 위 방법이 모두 실패했을 때만, npm 에 한정해 쓴다.

이 설정은 Node 가 여는 TLS 연결의 검증 기준만 낮춘다. 개발 PC 의 npm/Playwright 다운로드 용도로만 두고 서버나 CI 러너에는 복사하지 않는다.
