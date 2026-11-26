import type { VoxAdInfo } from '../../modules/vox-ads';

const RESULT_CODE: Record<VoxAdInfo['result'], string> = {
  filled: '200',
  noFill: '204',
  error: 'ERR',
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function host(url?: string): string {
  if (!url) return '-';
  const match = /^[a-z]+:\/\/([^/?#]+)/i.exec(url);
  return match ? match[1] : url;
}

/**
 * Lines for the request panel from VOX SDK 1.4.4's last answer: what the app sent
 * (app id, page, SDK) and what the SSP answered (code, time, winning creative).
 * Technical identifiers, so they stay untranslated like the endpoint lines.
 */
export function adInfoLines(info: VoxAdInfo): string[] {
  const at = new Date(info.startedAt);
  const time = `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`;
  const lines = [`<- ${RESULT_CODE[info.result]} · ${info.durationMs} ms · ${time}`];
  if (info.result === 'filled') {
    const parts = [`adId ${info.adId ?? '-'}`];
    if (info.adNetwork) parts.push(info.adNetwork);
    if (info.width && info.height) parts.push(`${info.width}x${info.height}`);
    if (info.isVast) parts.push('VAST');
    if (info.isPassback) parts.push('passback');
    lines.push(parts.join(' · '));
    if (info.bidId) lines.push(`bidId ${info.bidId}`);
    if (info.seanceId) lines.push(`seance ${info.seanceId}`);
  }
  if (info.result === 'error' && info.error) lines.push(`error ${info.error.slice(0, 120)}`);
  lines.push(`app ${info.applicationId ?? '-'} · page ${host(info.pageUrl)} · SDK ${info.sdkVersion ?? '-'}`);
  return lines;
}
