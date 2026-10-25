import { OfflineSternikCourse } from '../../src/course/OfflineSternikCourse';
import { useLearningBookmark } from '../../src/persistence/learning-bookmark';

// The Polish licence course ships locally, with shared theory, questions and
// mock exam. Oral practice checks typed answers locally and requests no mic.
export default function KursMotorowodny() {
  useLearningBookmark('motor');
  return <OfflineSternikCourse />;
}
