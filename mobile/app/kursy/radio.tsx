import { OfflineRadioCourse } from '../../src/course/OfflineRadioCourse';
import { useLearningBookmark } from '../../src/persistence/learning-bookmark';

// SRC Radio ships as a self-contained local web course. Theory, diagrams,
// questions and both ICOM simulators work on the first launch without a
// connection. Server speech grading is deliberately not imitated offline.
export default function KursRadio() {
  useLearningBookmark('radio');
  return <OfflineRadioCourse />;
}
