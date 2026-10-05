/**
 * 사람에게 알린다: Windows 알림 센터 토스트(PowerShell WinRT, 추가 설치 없음). 다른 OS 나 실패 시 콘솔에만 남긴다.
 * 로그인 자동화 논의 A 안(2026-10-02): 세션은 사람이 로그인하고, 끊기면 바로 알린다. 자격 증명은 다루지 않는다.
 */
import { spawn } from 'node:child_process';

const psEscape = (s: string) => s.replace(/'/g, "''").replace(/[<>&]/g, ' ');

export function notifyUser(title: string, body: string, log: (line: string) => void = console.log): void {
  log(`[알림] ${title} — ${body}`);
  if (process.platform !== 'win32' || process.env.PW_NOTIFY === '0') return;
  const script = [
    '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null',
    '[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null',
    `$xml = '<toast><visual><binding template="ToastGeneric"><text>${psEscape(title)}</text><text>${psEscape(body)}</text></binding></visual></toast>'`,
    '$doc = New-Object Windows.Data.Xml.Dom.XmlDocument; $doc.LoadXml($xml)',
    // 등록된 앱 id 가 필요하다 → PowerShell 의 AppUserModelID 를 빌린다
    "$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'",
    '[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($doc))',
  ].join('; ');
  try {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      stdio: 'ignore',
      windowsHide: true,
      detached: true,
    });
    child.on('error', () => undefined);
    child.unref();
  } catch {
    // 알림 실패는 무시 (로그에는 이미 남았다)
  }
}
