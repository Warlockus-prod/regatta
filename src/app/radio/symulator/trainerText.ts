import { useRadioI18n } from '../localization/context';
import type { Lang } from '@/lib/languages';
/** Compatibility entry for existing scenario and device controls. Resource JSON
 * is requested for the chosen locale instead of bundled into every JS chunk. */
export const useTrainerI18n = useRadioI18n;
export function fmt(text: string, vars: Readonly<Record<string, string | number>>): string {
 return text.replace(/\{(\w+)\}/g,(whole,key:string)=>key in vars?String(vars[key]):whole);
}
export function checkLabel(label:string,_lang:Lang,translate:(source:string)=>string=(source)=>source):string {
 const whole=translate(label);if(whole!==label)return whole;
 const value=/^(.*) \((.*)\)$/.exec(label);
 if(value){const template=`${value[1]} ({value})`;const localized=translate(template);if(localized!==template)return localized.replace('{value}',value[2]);}
 return label;
}
