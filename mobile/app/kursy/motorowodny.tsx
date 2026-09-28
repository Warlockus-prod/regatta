import { SectionWebView } from '../../src/course/SectionWebView';
import { useLearningBookmark } from '../../src/persistence/learning-bookmark';

// Kurs: sternik motorowodny (Polish licence). Embeds the full /sternik web
// section - theory, trainer and mock exam - always in Polish.
export default function KursMotorowodny() {
  useLearningBookmark('motor');
  return <SectionWebView path="/sternik" section="/sternik" title="Sternik motorowodny" />;
}
