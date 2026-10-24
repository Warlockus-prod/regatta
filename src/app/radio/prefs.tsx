'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { RadioModel } from "./symulator/radioModel";
import { useRadioI18n } from "./localization/context";
type ExplLang = "pl" | "ru" | "both";
interface RadioPrefs { explLang:ExplLang; radioRealistic:boolean; setRadioRealistic:(v:boolean)=>void; prefsLoaded:boolean }
const Context=createContext<RadioPrefs>({explLang:"pl",radioRealistic:false,setRadioRealistic:()=>{},prefsLoaded:false});
/** Radio follows the site/app language. Sternik's Polish exam policy stays in
 * its own provider. Existing radio model/progress keys are preserved. */
export function RadioPrefsProvider({children}:{children:ReactNode}) {
 const {lang}=useRadioI18n(); const [radioRealistic,setRealistic]=useState(false);const[prefsLoaded,setLoaded]=useState(false);
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{try{setRealistic(localStorage.getItem("sternik.radio.realistic.v1")==="1");}catch{}setLoaded(true);});
  return ()=>cancelAnimationFrame(frame);
 },[]);
 const setRadioRealistic=(v:boolean)=>{setRealistic(v);try{localStorage.setItem("sternik.radio.realistic.v1",v?"1":"0");}catch{}};
 return <Context.Provider value={{explLang:lang==="ru"?"ru":"pl",radioRealistic,setRadioRealistic,prefsLoaded}}>{children}</Context.Provider>;
}
export const useSternikPrefs=()=>useContext(Context);
export function RadioVariantToggle({model,onModel}:{model:RadioModel;onModel:(m:RadioModel)=>void}) {
 const {radioRealistic,setRadioRealistic}=useSternikPrefs();const {tp}=useRadioI18n();
 const options=[{id:"M330",label:"IC-M330",real:false},{id:"M323",label:"IC-M323",real:false},{id:"M330",label:tp("M330 реальный","M330 real","M330 realny"),real:true}] as const;
 return <div role="group" aria-label={tp("Рация","Radio","Radio")} className="flex flex-wrap gap-2">{options.map(o=><button key={`${o.id}-${o.real}`} type="button" data-testid={o.real?"radio-variant-real":`radio-variant-${o.id.toLowerCase()}`} aria-pressed={model===o.id&&radioRealistic===o.real} onClick={()=>{setRadioRealistic(o.real);onModel(o.id);}} className="min-h-[44px] rounded-lg border px-3 text-sm font-semibold" style={{background:model===o.id&&radioRealistic===o.real?"var(--accent-cyan)":"var(--bg-card)",color:model===o.id&&radioRealistic===o.real?"var(--accent-ink)":"var(--text-primary)",borderColor:"var(--border-subtle)"}}>{o.label}</button>)}</div>;
}
