import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const UserAgent = 'Mozilla/5.0 (compatible; HealthcareBusinessNews/1.0)';

/**
 * URL のテキストを取得する。
 * Node の fetch は HTTPS_PROXY を見ないので、プロキシ経由の環境（クラウドの Claude セッションなど）では
 * curl を使う。curl が無ければ fetch にフォールバックする。
 */
export async function fetchText(url, { maxTime = 30 } = {}) {
  try {
    const { stdout } = await run(
      'curl',
      ['-sSL', '--max-time', String(maxTime), '-A', UserAgent, '-w', '\n%{http_code}', url],
      { maxBuffer: 20 * 1024 * 1024 },
    );
    const cut = stdout.lastIndexOf('\n');
    const status = Number(stdout.slice(cut + 1));
    const body = stdout.slice(0, cut);
    if (status < 200 || status >= 400) throw new Error(`HTTP ${status}`);
    return body;
  } catch (e) {
    if (e.code !== 'ENOENT') throw e; // curl はあるが失敗した
  }
  const res = await fetch(url, { headers: { 'User-Agent': UserAgent }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}
