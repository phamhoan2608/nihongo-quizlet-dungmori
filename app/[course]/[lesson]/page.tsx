import { notFound } from "next/navigation";
import StudySession from "@/components/StudySession";
import { COURSES, getCourse } from "@/lib/courses";
import { getCards, getLessons } from "@/lib/vocab";

export function generateStaticParams() {
  return COURSES.flatMap((c) =>
    getLessons(c.id).map((l) => ({ course: c.id, lesson: String(l.lesson) }))
  );
}

export default function StudyPage({
  params,
}: {
  params: { course: string; lesson: string };
}) {
  const course = getCourse(params.course);
  if (!course) notFound();

  const lesson = Number(params.lesson);
  const cards = getCards(course.id, lesson);
  if (!cards.length) notFound();

  return <StudySession course={course.id} lesson={lesson} cards={cards} />;
}
