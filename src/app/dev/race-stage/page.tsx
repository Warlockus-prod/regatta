import { notFound } from "next/navigation";
import RaceStage from "./RaceStage";

/**
 * Development only: the race scene with boats placed by the link, for taking the pictures of the
 * race subjects (scripts/capture-race-frames.mjs). A production build answers 404.
 */
export default async function RaceStagePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const one = (key: string) => { const value = params[key]; return typeof value === "string" ? value : undefined; };
  return <RaceStage boats={one("boats")} wind={one("wind")} mark={one("mark")} line={one("line")} view={one("view")} look={one("look")} venue={one("venue")} arrows={one("arrows") === "1"} />;
}
