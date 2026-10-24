/** Position dictation is spoken in standard radio English in every locale.
 * The surrounding teaching copy is translated; examples and spoken tokens are
 * interpolation values, including deliberately incorrect examples. */
export function primaryRadioSource(source: string): string {
  const parts = source.split(" / ");
  const russian = parts.findIndex(part => /[а-яё]/i.test(part));
  return russian > 0 ? parts.slice(0, russian).join(" / ") : source;
}

export function protectRadioTerms(source: string): { template: string; values: string[] } {
  const values: string[] = [];
  const positionWords = /\b(?:ZERO|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|DEGREES|MINUTES|DECIMAL|POINT|NORTH|SOUTH|EAST|WEST)\b/g;
  if (!positionWords.test(source)) return { template: source, values };
  positionWords.lastIndex = 0;
  const englishExample = /["«]([a-zA-Z][a-zA-Z\d .,!?-]*)["»]/g;
  const marker = (value: string) => `{radioTerm${values.push(value) - 1}}`;
  // Protect complete quoted examples first, then the remaining spoken tokens.
  const template = source.replace(englishExample, (_whole, value: string) => `"${marker(value)}"`).replace(positionWords, marker);
  return { template, values };
}

export function restoreRadioTerms(template: string, values: readonly string[]): string {
  return template.replace(/\{radioTerm(\d+)\}/g, (whole, index: string) => values[Number(index)] ?? whole);
}
