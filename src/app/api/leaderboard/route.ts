import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { topByDifficulty, topByMission, topByRaceClass } from '@/lib/db';
import { publicRows } from '@/lib/race-submission';
import { raceContextForClassId, readRaceComparison } from "@/lib/race-record-class";
import { raceClassId } from "@/lib/race-context";

export const runtime = 'nodejs';

// Never expose the raw session id to clients (see publicRows()).
async function markMine<T extends { sid: string }>(
  rows: T[],
): Promise<Array<Omit<T, 'sid'> & { isMe: boolean }>> {
  const jar = await cookies();
  return publicRows(rows, jar.get('regatta_sid')?.value);
}

/**
 * GET /api/leaderboard?difficulty=easy&wind=medium[&mission=sub-90]
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams;
  if (query.has("raceClass") || query.has("raceMode")) {
    if (["raceClass", "raceMode", "difficulty", "wind"].some(key => query.getAll(key).length !== 1)
      || ["mission", "daily", "dailyDay", "day"].some(key => query.has(key))) {
      return NextResponse.json({ error: "Invalid class selectors" }, { status: 400 });
    }
    const raceContext = raceContextForClassId(query.get("raceClass"));
    const mode = query.get("raceMode");
    const difficulty = query.get("difficulty")!;
    const wind = query.get("wind")!;
    if (!raceContext || (mode !== "simple" && mode !== "pro")
      || !readRaceComparison({ raceContext, mode, difficulty, windStrength: wind }).ok) {
      return NextResponse.json({ error: "Invalid race class" }, { status: 400 });
    }
    const classId = raceClassId(raceContext);
    const selected = topByRaceClass(classId, mode, difficulty, wind, 20);
    if (selected === null) return NextResponse.json({ error: "Leaderboard unavailable" }, { status: 500 });
    // Project explicit columns before removing sid. Stored context JSON or
    // future database fields never become public response authority.
    const rows = await markMine(selected.map(row => ({
      nickname: row.nickname, sid: row.sid, difficulty: row.difficulty, wind_strength: row.wind_strength,
      mission_id: row.mission_id, finish_time_sec: row.finish_time_sec, score: row.score, ts: row.ts,
      race_class_id: classId, race_mode: mode, raw_finish_time_sec: row.raw_finish_time_sec, penalty_seconds: row.penalty_seconds,
    })));
    return NextResponse.json({ rows, mode: "free", difficulty, wind, raceClass: classId, raceMode: mode, raceContext });
  }
  const mission = url.searchParams.get('mission');
  if (mission && (mission.length > 40 || !/^[a-z0-9_-]+$/i.test(mission))) {
    return NextResponse.json({ error: 'bad mission' }, { status: 400 });
  }
  if (mission) {
    const rows = await markMine(topByMission(mission, 20));
    return NextResponse.json({ rows, mode: 'mission', mission });
  }
  const difficulty = url.searchParams.get('difficulty') ?? 'medium';
  const wind = url.searchParams.get('wind') ?? 'medium';
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    return NextResponse.json({ error: 'bad difficulty' }, { status: 400 });
  }
  if (!['light', 'medium', 'heavy'].includes(wind)) {
    return NextResponse.json({ error: 'bad wind' }, { status: 400 });
  }
  const rows = await markMine(topByDifficulty(difficulty, wind, 20));
  return NextResponse.json({ rows, mode: 'free', difficulty, wind });
}
