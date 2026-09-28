import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));
let nextRequestAt = 0;

export interface ApiResponse<T> {
  url: string;
  data: T[];
  checksum: string;
}

export async function requestOpenF1<T>(endpoint: string, parameters: Record<string, string | number>, allowMissing = false): Promise<ApiResponse<T>> {
  const url = new URL(`https://api.openf1.org/v1/${endpoint}`);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, String(value));
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    await delay(Math.max(0, nextRequestAt - Date.now()));
    nextRequestAt = Date.now() + 2200;
    try {
      const { stdout } = await execFileAsync('curl', ['-fsSL', '--max-time', '40', '--connect-timeout', '12', '--retry', '2', '--retry-delay', '2', url.toString()], { maxBuffer: 64 * 1024 * 1024 });
      const parsed: unknown = JSON.parse(stdout);
      if (!Array.isArray(parsed)) throw new Error(`${endpoint} response is not an array`);
      return { url: url.toString(), data: parsed as T[], checksum: createHash('sha256').update(stdout).digest('hex') };
    } catch (error) {
      if (allowMissing && String(error).includes('404')) return { url: url.toString(), data: [], checksum: '' };
      lastError = error;
      await delay(Math.min(16000, 1500 * 2 ** attempt));
    }
  }
  throw new Error(`OpenF1 ${endpoint} failed after retries: ${String(lastError)}`);
}
