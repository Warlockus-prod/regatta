import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SRC_BANK } from '@/data/src-radio';
import { SCENARIOS } from './scenarios';
import { PRACTICAL_TASKS } from '../zadania/tasks';
import { THEORY_CHAPTERS } from '../teoria/courseData';
import { checkLabel, fmt } from './trainerText';
import { radioText, type RadioAliases, type RadioCatalog } from '../localization/text';
import { examOptionText, examQuestionText, examExplanationText, hasEnglishOptions } from '../localization/examText';
import { ENGLISH_EXPLANATIONS, ENGLISH_QUESTION_MEANINGS } from '../localization/englishExercises';
import { protectRadioTerms, restoreRadioTerms } from '../localization/protocolTerms';
import { POSITIONS, POS_RULES_PL } from '../pozycja/drillData';
const root=process.cwd();
const sources=JSON.parse(readFileSync(join(root,'src/app/radio/localization/sources.json'),'utf8')) as {id:string;source:string}[];
const aliases=JSON.parse(readFileSync(join(root,'public/radio-locales/aliases.json'),'utf8')) as RadioAliases;
const normalize=(s:string)=>s.replace(/\s+/g,' ').trim();
const catalogs=Object.fromEntries(['pl','ru','en','es','fr','de','it'].map(lang=>[lang,JSON.parse(readFileSync(join(root,`public/radio-locales/${lang}.json`),'utf8')) as RadioCatalog]));
const placeholders=(s:string)=>(s.match(/\{\w+\}/g)??[]).sort();
describe('complete radio learning resources',()=>{
 it('covers real questions, options and explanations without changing exam IDs',()=>{
  expect(SRC_BANK).toHaveLength(324);expect(PRACTICAL_TASKS).toHaveLength(26);expect(SCENARIOS).toHaveLength(19);expect(THEORY_CHAPTERS).toHaveLength(18);
  for(const q of SRC_BANK)for(const text of [q.q,...q.options,q.whyPl])expect(aliases[normalize(text)],`${q.id}: ${text}`).toBeTruthy();
 });
 for(const lang of ['pl','ru','en','es','fr','de','it']){
  it(`${lang}: every enumerated course resource is present, with intact placeholders and MMSIs`,()=>{
   const dict=catalogs[lang];
   const missing=sources.filter(s=>!dict[s.id]);
   expect(missing.length,JSON.stringify({lang,missing:missing.length,firstIds:missing.slice(0,12).map(item=>item.id)})).toBe(0);
   for(const resource of sources){const translated=dict[resource.id];if(!translated)continue;expect(translated).toBeTruthy();expect(placeholders(translated),resource.source).toEqual(placeholders(resource.source));expect(translated).not.toMatch(/[\u2013\u2014]/);for(const mmsi of resource.source.match(/\b\d{9}\b/g)??[])expect(translated,resource.source).toContain(mmsi);}
  });
 }
 it('localizes a bank question in every non-Polish language and keeps its original intact',()=>{
  const q=SRC_BANK[0],original=JSON.stringify(q);
  for(const lang of ['ru','en','es','fr','de','it'])expect(radioText(q.q,catalogs[lang],aliases)).not.toBe(q.q);
  expect(JSON.stringify(q)).toBe(original);
 });
 it('translates value-carrying grader labels in Russian and other locales',()=>{
  const label='dokładna pozycja (50 43.4 NORTH, 001 30.2 WEST)';
  for(const lang of ['ru','en','es','fr','de','it'] as const){const translated=checkLabel(label,lang,s=>radioText(s,catalogs[lang],aliases));expect(translated).toContain('50 43.4 NORTH, 001 30.2 WEST');expect(translated).not.toContain('dokładna');}
  expect(fmt('{n}% min',{n:70})).toBe('70% min');
 });
 it('does not rewrite non-text state, input structures or an unknown spoken transmission',()=>{
  const state={id:'power',score:70};expect(radioText(state,catalogs.de,aliases)).toBe(state);
  const spoken='MAYDAY MAYDAY MAYDAY THIS IS BALTIC STAR BALTIC STAR BALTIC STAR OVER';expect(radioText(spoken,catalogs.de,aliases)).toBe(spoken);
 });
 it('preserves all 60 English exercise choices, including deliberate grammar errors',()=>{
  const english=SRC_BANK.filter(hasEnglishOptions);expect(english).toHaveLength(60);
  for(const q of english)for(const option of q.options)expect(examOptionText(q,option,()=>"translated")).toBe(option);
  for(const q of english){const protectedText=ENGLISH_EXPLANATIONS[q.id];expect(protectedText).toBeTruthy();for(const value of Object.values(protectedText.terms))for(const lang of ['pl','ru','en','es','fr','de','it'])expect(examExplanationText(q,s=>radioText(s,catalogs[lang],aliases))).toContain(value);}
 });
 it('keeps English cloze stems and only adapts their local-language hints',()=>{
  for(const id of ['src-1-132','src-1-134','src-1-135']){const q=SRC_BANK.find(q=>q.id===id)!;for(const lang of ['pl','ru','en','es','fr','de','it'] as const){const text=examQuestionText(q,lang,()=>"translated");expect(text.split(' (')[0]).toBe(q.q.split(' (')[0]);expect(text).toContain('(');expect(text).not.toContain('translated');}}
 });
 it('preserves reviewed nautical meanings instead of literal distractor meanings',()=>{
  for(const [id,meanings] of Object.entries(ENGLISH_QUESTION_MEANINGS)){
   const question=SRC_BANK.find(question=>question.id===id)!;
   for(const lang of ['pl','ru','en','es','fr','de','it'] as const)expect(examQuestionText(question,lang,text=>radioText(text,catalogs[lang],aliases))).toBe(meanings[lang]);
  }
 });
 it('keeps every spoken position token and incorrect English example in every locale',()=>{
  for(const source of [...POS_RULES_PL,...POSITIONS.flatMap(p=>[p.trapPl,...p.must.map(m=>m.label)])]){
   const protectedText=protectRadioTerms(source);expect(restoreRadioTerms(protectedText.template,protectedText.values).replaceAll('«','"').replaceAll('»','"')).toBe(source.replaceAll('«','"').replaceAll('»','"'));
   for(const lang of ['pl','ru','en','es','fr','de','it']){const translated=radioText(source,catalogs[lang],aliases);for(const token of protectedText.values)expect(translated,`${lang}: ${source}`).toContain(token);expect(translated).not.toMatch(/\{radioTerm\d+\}/);}
  }
 });
});
