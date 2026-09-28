import { destinations, searchDestinations, sections, words, type Language, type Section } from "./catalog";
import { copy } from "./copy";

// Content taxonomy is shared; web header and native tabs are separate shells.
export const menuEntry = { id: "menu", web: "/menu", native: "/menu", title: copy.menu, icon: "menu" } as const;
export const primarySections = sections.filter(section => section.id !== "library");
export const nativeTabs = [...primarySections, menuEntry];
export const menuCopy = {
  reference: words("На борту и справочные материалы", "On board and reference", "Na pokładzie i materiały", "A bordo y consultas", "À bord et références", "An Bord und Nachschlagen", "A bordo e riferimenti"),
  service: words("Помощь и настройки", "Help and settings", "Pomoc i ustawienia", "Ayuda y ajustes", "Aide et réglages", "Hilfe und Einstellungen", "Aiuto e impostazioni"),
  appearance: words("Оформление сайта", "Website appearance", "Wygląd strony", "Aspecto del sitio", "Apparence du site", "Website-Darstellung", "Aspetto del sito"),
};
const serviceIds = new Set(["ask", "settings", "support", "privacy"]);

/** Every public destination appears once; platform-only routes stay on their platform. */
export function menuGroups(query: string, lang: Language, platform: "web" | "native") {
  const entries = searchDestinations(query, lang, platform);
  return [
    { id: "learn", title: sections.find(s => s.id === "learn")!.title, entries: entries.filter(d => d.section === "learn" && !d.certificate) },
    { id: "exam", title: copy.exam, entries: entries.filter(d => d.certificate) },
    ...(["practice", "race"] as const).map(id => ({ id, title: sections.find(s => s.id === id)!.title, entries: entries.filter(d => d.section === id) })),
    { id: "reference", title: menuCopy.reference, entries: entries.filter(d => d.section === "library" && !serviceIds.has(d.id)) },
    { id: "service", title: menuCopy.service, entries: entries.filter(d => serviceIds.has(d.id)) },
  ].filter(group => group.entries.length > 0);
}

export function navigationItemForSection(section: Section) {
  return section === "library" ? "menu" : section;
}

export const menuDestinationCount = (platform: "web" | "native") => destinations.filter(d => d[platform]).length;
