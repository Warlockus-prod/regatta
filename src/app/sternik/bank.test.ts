import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { STERNIK_BANK_FILE } from '@/data/sternik-bank-file.generated';
import { loadSternikBank, peekSternikBank, resetSternikBankForTests } from './bank';

// ============================================================================
// Contract: the trainer and the exam get the bank from the versioned file; a
// failed load is not cached, so Retry asks again and then succeeds.
// ============================================================================

const file = JSON.parse(readFileSync(join(resolve(__dirname, '../../..'), 'public', STERNIK_BANK_FILE.url), 'utf8'));

afterEach(() => { resetSternikBankForTests(); vi.unstubAllGlobals(); });

describe('loadSternikBank', () => {
  it('fetches the versioned file named by the generated module', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify(file), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const bank = await loadSternikBank();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(STERNIK_BANK_FILE.url);
    expect(bank.questions).toHaveLength(STERNIK_BANK_FILE.count);
    expect(peekSternikBank()).toBe(bank);
  });

  it('a failure is not remembered: the retry reads again and succeeds', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('down', { status: 503 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify(file), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadSternikBank()).rejects.toThrow(/503/);
    expect(peekSternikBank()).toBeNull();
    await expect(loadSternikBank()).rejects.toThrow(/fetch/);
    const bank = await loadSternikBank();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(bank.byId[file.questions[0].id].q).toBe(file.questions[0].q);
  });

  it('a malformed or stale file is an error, and the next attempt reads again', async () => {
    const read = vi.fn()
      .mockResolvedValueOnce('<html>captive portal</html>')
      .mockResolvedValueOnce({ ...file, version: '000000000000' })
      .mockResolvedValueOnce(file);
    await expect(loadSternikBank(read)).rejects.toThrow();
    await expect(loadSternikBank(read)).rejects.toThrow(/version/);
    await expect(loadSternikBank(read)).resolves.toMatchObject({ version: STERNIK_BANK_FILE.version });
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('concurrent screens share one request, and a loaded bank is not fetched again', async () => {
    let release!: (v: unknown) => void;
    const read = vi.fn(() => new Promise((r) => { release = r; }));
    const a = loadSternikBank(read), b = loadSternikBank(read);
    release(file);
    expect(await a).toBe(await b);
    await loadSternikBank(read);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
