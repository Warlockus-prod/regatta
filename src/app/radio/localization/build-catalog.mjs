// Enumerate local radio resources and preserve reviewed translations.
// Translation is an explicit editorial step; this generator makes no network calls.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import ts from "typescript";
const root = process.cwd();
const out = path.join(root, "src/app/radio/localization");
const publicOut = path.join(root, "public/radio-locales");
const langs = ["pl", "ru", "en", "es", "fr", "de", "it"];
const records = new Map();
const checkMode = process.argv.includes("--check");
const statsMode = process.argv.includes("--stats");
let stale = false;
function save(file, value) {
 if(statsMode)return;
 const serialized=JSON.stringify(value,null,2)+"\n";
 if(checkMode){if(!fs.existsSync(file)||fs.readFileSync(file,"utf8")!==serialized){console.error(`[radio-catalog] stale ${path.relative(root,file)}`);stale=true;}}
 else fs.writeFileSync(file,serialized);
}
const normalize = (s) => s.replace(/\s+/g, " ").trim();
const idFor = (s) => crypto.createHash("sha256").update(normalize(s)).digest("hex").slice(0, 16);
const text = (n) => n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isJsxText(n)) ? n.text : null;
const protocolModule=ts.transpileModule(fs.readFileSync(path.join(out,"protocolTerms.ts"),"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {protectRadioTerms,primaryRadioSource}=await import(`data:text/javascript;base64,${Buffer.from(protocolModule).toString("base64")}`);
function human(s) {
 if (!s || s.length < 2 || !/[\p{L}]/u.test(s)) return false;
 if (/^(?:[./#]|https?:|mailto:|data:|var\(|rgba?\(|linear-gradient|radial-gradient|repeating-|url\(|application\/|audio\/|--|@)/.test(s)) return false;
 if (/\b(?:px|rem|dvh)\b|[{};=]|^[\w.-]+(?:\/[\w.-]+)+$|^\w+(?:-\w+){2,}$/.test(s)) return false;
 if (/^[a-z][a-zA-Z0-9._-]*$/.test(s) && !/[ąćęłńóśźż]/i.test(s)) return false;
 if (/^[A-Z0-9 /.,:+*()[\]<>°%-]+$/.test(s)) return false;
 return true;
}
function add(s, known = {}, force = false) {
 if (!s || (!force && !human(s))) return;
 const id=idFor(s);
 const old=records.get(id) ?? { id, source:s, known:{} };
 Object.assign(old.known, known); records.set(id, old);
}
function files(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory() ? (e.name==="localization"||e.name==="i18n" ? [] : files(path.join(dir,e.name))) : /\.(?:ts|tsx)$/.test(e.name)&&!e.name.includes(".test.") ? [path.join(dir,e.name)] : []); }
const technicalFields=new Set(["terms","anyOf","warnOf","say","youSay","stationSays","className","style","background","backgroundImage","boxShadow","borderColor","fontFamily","fill","stroke","viewBox"]);
const technicalAttributes=new Set(["className","style","fill","stroke","d","viewBox","strokeWidth","xmlns","href","src","id","data-testid","data-ik","key","role","type","dir","target","rel","as"]);
const inputs=[...files(path.join(root,"src/app/radio")),path.join(out,"englishExercises.ts"),path.join(root,"src/data/src-radio.ts"),...files(path.join(root,"mobile/scripts/offline-radio"))];
for (const f of inputs) {
 const src=fs.readFileSync(f,"utf8"); const sf=ts.createSourceFile(f,src,ts.ScriptTarget.Latest,true,f.endsWith("tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 function visit(n) {
  // These are reducer patterns, exact radio speech or styling, not learning copy.
  // They never pass through a text translator at runtime.
  if(ts.isPropertyAssignment(n)&&technicalFields.has(n.name.getText(sf).replace(/["']/g,"")))return;
  if(ts.isJsxAttribute(n)&&technicalAttributes.has(n.name.getText(sf)))return;
  if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){
   const attributes=new Map(n.attributes.properties.filter(ts.isJsxAttribute).map(attribute=>[attribute.name.getText(sf),attribute.initializer]));
   const literal=value=>value&&ts.isJsxExpression(value)?value.expression:value;
   const paired=Object.fromEntries(langs.map(lang=>[lang,text(literal(attributes.get(lang)))]));
   if(paired.pl)add(paired.pl,Object.fromEntries(Object.entries(paired).filter(([,value])=>value)),true);
   // The guide's Table renders these literal arrays, including "=" and real
   // hardware labels which the generic code/style filter intentionally skips.
   if(n.tagName.getText(sf)==="Table"){
    const head=literal(attributes.get("head")),rows=literal(attributes.get("rows"));
    if(head&&ts.isArrayLiteralExpression(head)){
     const visible=head.elements.map(item=>{const value=text(item);return value!==null&&!/[а-яё]/i.test(value);});
     for(const[index,item]of head.elements.entries())if(visible[index])add(text(item),{},true);
     // Table omits the historical Russian-only helper column in every locale.
     if(rows&&ts.isArrayLiteralExpression(rows))for(const row of rows.elements)if(ts.isArrayLiteralExpression(row))for(const[index,item]of row.elements.entries())if(visible[index])add(text(item),{},true);
    }
   }
  }
  if (ts.isCallExpression(n)) {
   const name=n.expression.getText(sf).split(".").at(-1);
   if (["tp","t"].includes(name)&&n.arguments.length>=3) {
    const [ru,en,pl]=n.arguments.map(text); if(pl&&en&&ru) add(pl,{pl,ru,en},true);
   }
   if(name==="b"&&n.arguments.length===2){const [pl,ru]=n.arguments.map(text);if(pl&&ru)add(pl,{pl,ru},true);}
  }
  if(ts.isObjectLiteralExpression(n)) {
   const fields=Object.fromEntries(n.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText(sf).replace(/["']/g,""),text(p.initializer)]));
   if(fields.pl) add(fields.pl,Object.fromEntries(langs.filter(l=>fields[l]).map(l=>[l,fields[l]])),true);
   for(const k of Object.keys(fields).filter(k=>k.endsWith("Pl"))) {const base=k.slice(0,-2);if(fields[k])add(fields[k],{pl:fields[k],...(fields[`${base}Ru`]?{ru:fields[`${base}Ru`]}:{})},true);}
   // The official question bank includes short words, numbers and acronyms;
   // enumerate every visible field, including ones the generic filter skips.
   if(/^src-[12]-\d+$/.test(fields.id??"")){
    if(fields.q)add(fields.q,{pl:fields.q},true);
    const options=n.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(sf).replace(/["']/g,"")==="options");
    if(options&&ts.isArrayLiteralExpression(options.initializer))for(const item of options.initializer.elements){const value=text(item);if(value)add(value,{pl:value},true);}
   }
   // English-language exercises assess these exact (sometimes wrong) phrases.
   // Never translate or repair their answer options in any locale.
   if(/^src-1-(?:11[5-9]|1[2-6]\d|17[0-4])$/.test(fields.id??"")){
    const options=n.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(sf).replace(/["']/g,"")==="options");
    if(options&&ts.isArrayLiteralExpression(options.initializer))for(const item of options.initializer.elements){const value=text(item);if(value)add(value,Object.fromEntries(langs.map(lang=>[lang,value])),true);}
   }
   const keywords=n.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(sf).replace(/["']/g,"")==="keywords");
   if(keywords&&ts.isArrayLiteralExpression(keywords.initializer))for(const item of keywords.initializer.elements){const value=text(item);if(value)add(value,{},true);}
  }
  if(ts.isConditionalExpression(n)) {const ru=text(n.whenTrue),pl=text(n.whenFalse);if(ru&&pl&&/[а-яё]/i.test(ru))add(pl,{pl,ru},true);}
  if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||ts.isJsxText(n)){
   const p=n.parent;
   if(!ts.isLiteralTypeNode(p)&&!ts.isImportDeclaration(p)&&!(ts.isJsxAttribute(p)&&!["title","aria-label","placeholder","alt"].includes(p.name.getText(sf)))) add(n.text);
  }
  if(ts.isTemplateExpression(n)) {
   const value=n.head.text+n.templateSpans.map((s,i)=>`{${i}}`+s.literal.text).join("");
   if(human(value.replace(/\{\d+\}/g,"VALUE"))) add(value,{},true);
  }
  ts.forEachChild(n,visit);
 }
 visit(sf);
}
// Reuse the reviewed trainer translations and connect source aliases.
for(const lang of ["en","es","fr","de","it"]){const dict=JSON.parse(fs.readFileSync(path.join(root,`src/app/radio/symulator/i18n/${lang}.json`)));for(const [pl,value]of Object.entries(dict))add(pl,{pl,[lang]:value},true);}
const pairedAliases=new Map();
for(const rec of records.values())for(const value of Object.values(rec.known))if(value)pairedAliases.set(normalize(value),rec.id);
// This exact standalone TOC source already had a reviewed resource and still
// exists in the guide. Keep its ID and alias alongside the newly paired title.
const legacyGuideSource="Поиск неисправностей";
for(const [id,rec]of records)if(rec.source!==legacyGuideSource&&Object.keys(rec.known).length===0&&pairedAliases.has(rec.source)&&pairedAliases.get(rec.source)!==id)records.delete(id);
// Keep spoken English position tokens out of the translation input. Register
// the real source as an alias of its interpolation template for explicit rt().
const protectedAliases={},redirects={};
for(const [id,rec]of [...records]){
 const primary=primaryRadioSource(rec.source);if(primary===rec.source)continue;
 const primaryId=idFor(primary);records.delete(id);add(primary,{pl:primary},true);redirects[id]=primaryId;protectedAliases[normalize(rec.source)]=primaryId;
 for(const value of Object.values(rec.known))if(value)protectedAliases[normalize(value)]=primaryId;
}
for(const [id,rec]of [...records]){
 const protectedSource=protectRadioTerms(rec.source);if(!protectedSource.values.length)continue;
 const known={};for(const [lang,value]of Object.entries(rec.known)){const p=protectRadioTerms(value);if(JSON.stringify(p.values)===JSON.stringify(protectedSource.values))known[lang]=p.template;}
 const protectedId=idFor(protectedSource.template);records.delete(id);add(protectedSource.template,known,true);redirects[id]=protectedId;protectedAliases[normalize(rec.source)]=protectedId;
 for(const value of Object.values(rec.known))if(value)protectedAliases[normalize(value)]=protectedId;
}
const list=[...records.values()].sort((a,b)=>a.id.localeCompare(b.id));
const aliases={};for(const rec of list){aliases[normalize(rec.source)]=rec.id;for(const value of Object.values(rec.known))if(value)aliases[normalize(value)]=rec.id;}
Object.assign(aliases,protectedAliases);
// The new heading must not take over the existing cheat-sheet shorthand.
for(const[alias,source]of [[legacyGuideSource,legacyGuideSource],["Шпаргалка","Ściąga"]])if(records.has(idFor(source)))aliases[alias]=idFor(source);
for(const key of Object.keys(aliases)){const visited=new Set();while(redirects[aliases[key]]&&!visited.has(aliases[key])){visited.add(aliases[key]);aliases[key]=redirects[aliases[key]];}}
save(path.join(out,"sources.json"),list);
save(path.join(publicOut,"aliases.json"),aliases);
console.log(`radio catalog: ${list.length} resources, ${Object.keys(aliases).length} aliases, ${list.reduce((n,r)=>n+r.source.length,0)} source characters`);
for(const lang of langs){const file=path.join(publicOut,`${lang}.json`);const previous=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{};const dict={};for(const r of list){const value=r.known[lang]??previous[r.id];if(value)dict[r.id]=value;}save(file,dict);if(statsMode)console.log(`${lang}: missing ${list.filter(r=>!dict[r.id]).length}, ${list.filter(r=>!dict[r.id]).reduce((sum,r)=>sum+r.source.length,0)} source characters`);}
if(stale)process.exitCode=1;
