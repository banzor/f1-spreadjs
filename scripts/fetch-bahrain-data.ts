import { mkdir, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { OpenF1Responses } from './types/openf1';
import { requestOpenF1 } from './openf1-client';
import { normalizeBahrain } from './normalize-bahrain';

async function main(): Promise<void> {
  const sessionKey = 10014;
  const session = await requestOpenF1<OpenF1Responses['sessions'][number]>('sessions', { year: 2025, country_name: 'Bahrain', session_name: 'Race' });
  const selected = session.data.find(row => row.session_key === sessionKey);
  if (!selected || selected.is_cancelled) throw new Error('Pinned 2025 Bahrain race session is unavailable');
  const endpointNames = ['meetings', 'drivers', 'starting_grid', 'session_result', 'laps', 'stints', 'pit', 'position', 'race_control', 'weather'] as const;
  const raw = { sessions: session.data } as OpenF1Responses;
  const requests = [session.url];
  const checksums: Record<string, string> = { sessions: session.checksum };
  for (const name of endpointNames) {
    const query: Record<string, number> = name === 'meetings' ? { meeting_key: selected.meeting_key } : { session_key: sessionKey };
    const response = await requestOpenF1<OpenF1Responses[typeof name][number]>(name, query, name === 'starting_grid' || name === 'weather');
    Object.assign(raw, { [name]: response.data });
    requests.push(response.url);
    checksums[name] = response.checksum;
    process.stdout.write(`${name}: ${response.data.length}\n`);
  }
  const dataset = normalizeBahrain(raw, requests, checksums, new Date().toISOString());
  const target = resolve('src/data/bahrain-race.json');
  await mkdir(resolve('src/data'), { recursive: true });
  const temporary = `${target}.tmp`;
  await writeFile(temporary, `${JSON.stringify(dataset)}\n`);
  await rename(temporary, target);
  process.stdout.write(`Saved ${dataset.drivers.length} drivers and ${dataset.qualityIssues.length} quality notes to ${target}\n`);
}

main().catch(error => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
