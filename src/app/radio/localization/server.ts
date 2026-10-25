import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { isLang } from "@/lib/languages";
import type { Lang } from "@/lib/languages";
import { radioText, type RadioAliases, type RadioCatalog } from "./text";
export async function serverRadioResources(lang: Lang): Promise<{catalog:RadioCatalog;aliases:RadioAliases}> {
 const directory=join(process.cwd(),"public/radio-locales");
 const [catalog,aliases]=await Promise.all([readFile(join(directory,`${lang}.json`),"utf8"),readFile(join(directory,"aliases.json"),"utf8")]);
 return {catalog:JSON.parse(catalog) as RadioCatalog,aliases:JSON.parse(aliases) as RadioAliases};
}

export async function localizedRadioMetadata(metadata: Metadata): Promise<Metadata> {
  const requestLang = (await headers()).get("x-regatta-lang");
  const { catalog, aliases } = await serverRadioResources(isLang(requestLang) ? requestLang : "ru");
  return {
    ...metadata,
    title: typeof metadata.title === "string" ? radioText(metadata.title, catalog, aliases) : metadata.title,
    description: radioText(metadata.description, catalog, aliases),
    keywords: Array.isArray(metadata.keywords) ? metadata.keywords.map(value => radioText(value, catalog, aliases)) : radioText(metadata.keywords, catalog, aliases),
  };
}
