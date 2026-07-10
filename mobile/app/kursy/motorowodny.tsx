import { SectionWebView } from '../../src/course/SectionWebView';

// Kurs: sternik motorowodny (Polish licence). Embeds the full /sternik web
// section - theory, trainer and mock exam - always in Polish.
export default function KursMotorowodny() {
  return <SectionWebView path="/sternik" section="/sternik" title="Sternik motorowodny" />;
}
