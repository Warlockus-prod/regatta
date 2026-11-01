import { ruleScenarios } from '@/data/rules';

/** M4-2: the rule card a link asks for (`/rules?rule=<id>`, from the race
 * debrief), only when that card exists; otherwise the page opens as before. */
export function ruleFromSearch(search: string): string | null {
  const id = new URLSearchParams(search).get('rule');
  return ruleScenarios.some((r) => r.id === id) ? id : null;
}
