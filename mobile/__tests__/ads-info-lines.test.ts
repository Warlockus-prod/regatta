import { adInfoLines } from '../src/ads/ad-info';
import type { VoxAdInfo } from '../modules/vox-ads';

const base: VoxAdInfo = {
  endpoint: 'https://ssp.hybrid.ai/auction/getad',
  placeId: '6ae4bdb3810d986308d66830',
  applicationId: 'com.icoffio.regatta',
  pageUrl: 'https://weektoregatta.com/',
  sdkVersion: '1.4.4',
  startedAt: new Date(2026, 10, 24, 9, 5, 7).getTime(),
  durationMs: 166,
  result: 'filled',
  isPassback: false,
  isVast: false,
};

describe('adInfoLines', () => {
  it('shows the code, the winning creative and what was sent', () => {
    const lines = adInfoLines({
      ...base,
      adId: '6aff61ee585ccf36b89a51d2',
      adNetwork: 'Vox',
      width: 300,
      height: 600,
      bidId: 'b1',
      seanceId: 's1',
    });
    expect(lines).toEqual([
      '<- 200 · 166 ms · 09:05:07',
      'adId 6aff61ee585ccf36b89a51d2 · Vox · 300x600',
      'bidId b1',
      'seance s1',
      'app com.icoffio.regatta · page weektoregatta.com · SDK 1.4.4',
    ]);
  });

  it('marks a no fill as 204 without creative lines', () => {
    expect(adInfoLines({ ...base, result: 'noFill' })).toEqual([
      '<- 204 · 166 ms · 09:05:07',
      'app com.icoffio.regatta · page weektoregatta.com · SDK 1.4.4',
    ]);
  });

  it('shows the error text and dashes for missing request fields', () => {
    const lines = adInfoLines({ ...base, result: 'error', error: 'timedOut', applicationId: undefined, pageUrl: undefined });
    expect(lines).toEqual(['<- ERR · 166 ms · 09:05:07', 'error timedOut', 'app - · page - · SDK 1.4.4']);
  });
});
