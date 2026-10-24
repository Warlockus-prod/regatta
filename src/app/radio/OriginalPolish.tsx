'use client';
import type { ReactNode } from "react";
import { useRadioI18n } from "./localization/context";
/** Exact source quotation. It is deliberately outside the explicit text reads
 * used by learning content, so exam wording and answer order remain intact. */
export function OriginalPolish({children}:{children:ReactNode}) {
 const {lang,tl}=useRadioI18n();
 if(lang==="pl")return null;
 return <details className="mt-3 rounded-xl border p-3 text-sm" style={{borderColor:"var(--border-subtle)"}}>
  <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold">{tl({ru:"Польский оригинал UKE",en:"Original UKE wording in Polish",pl:"Oryginał UKE po polsku",es:"Texto original de UKE en polaco",fr:"Texte original de l'UKE en polonais",de:"Polnischer Originaltext der UKE",it:"Testo originale UKE in polacco"})}</summary>
  <div lang="pl" data-radio-verbatim="true" className="mt-2 space-y-2">{children}</div>
 </details>;
}
