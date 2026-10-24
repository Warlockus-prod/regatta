import { useLocalSearchParams, useRouter } from "expo-router";
import { AnalyticsEvent } from "../analytics/events";
import { useAnalytics } from "../analytics/use-analytics";
import { recordReviewWin } from "../review/review-prompt";
import { parseSternikEntries, persistSternikEntries, readSternikEntries, sternikBootstrap, sternikHref, sternikStorageEvent, STERNIK_MESSAGE_LIMIT } from "../persistence/sternik-storage";
import { LocalCourseWebView } from "./LocalCourseWebView";

const asset = require("../../assets/sternik-offline.html");
const storage = { read: readSternikEntries, parse: parseSternikEntries, persist: persistSternikEntries, bootstrap: sternikBootstrap, response: sternikStorageEvent };

export function OfflineSternikCourse() {
  const params = useLocalSearchParams<{ path?: string }>();
  const router = useRouter();
  const analytics = useAnalytics();
  const href = sternikHref(params.path) ?? "/sternik?lang=pl&embed=1";
  return <LocalCourseWebView asset={asset} title="Sternik motorowodny" baseUrl="https://weektoregatta.com/sternik" href={href}
    readyMessage="sternik-offline-ready" errorMessage="sternik-offline-error" progressMessage="sternik-offline-progress" messageLimit={STERNIK_MESSAGE_LIMIT}
    storage={storage} localHref={sternikHref} examBase="sternik" onOpenRadio={() => router.navigate("/kursy/radio")}
    onExamFinished={exam => {
      analytics.capture(AnalyticsEvent.ExamFinished, exam);
      if (exam.passed) void recordReviewWin("exam-passed").catch(() => undefined);
    }} />;
}
