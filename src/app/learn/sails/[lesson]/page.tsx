import { notFound } from "next/navigation";
import { findSailLesson, sailLessons } from "../../../../data/sailing-lab/course";
import { SailingCourse } from "../../../../features/sailing-lab/ui/SailingCourse";

export function generateStaticParams() { return sailLessons.map(lesson => ({ lesson: lesson.id })); }
export default async function Page({ params }: { params: Promise<{ lesson: string }> }) {
  const { lesson } = await params;
  if (!findSailLesson(lesson)) notFound();
  return <SailingCourse key={lesson} lessonId={lesson} />;
}
