import Link from "next/link";
import { notFound } from "next/navigation";
import LessonCard from "@/components/LessonCard";
import SearchBox from "@/components/SearchBox";
import { COURSES, getCourse } from "@/lib/courses";
import { getLessons, countCards, getCards } from "@/lib/vocab";

export function generateStaticParams() {
  return COURSES.map((c) => ({ course: c.id }));
}

export default function CoursePage({ params }: { params: { course: string } }) {
  const course = getCourse(params.course);
  if (!course) notFound();

  const lessons = getLessons(course.id);
  const total = countCards(course.id);

  // All cards in this course, for search
  const courseCards = lessons.flatMap((info) => getCards(course.id, info.lesson));

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
      <header className="mb-8 sm:mb-12">
        <Link href="/" className="text-sm font-semibold text-indigo hover:underline">
          ← Tất cả cấp độ
        </Link>
        <p className="mb-2 mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-shu">
          {course.title} · {course.label}
        </p>
        <h1 className="font-jp text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Flashcards
        </h1>
        <p className="mt-3 max-w-xl text-sub">
          {total} từ vựng &amp; mẫu câu. Chọn một bài để luyện bằng lật thẻ, trắc nghiệm,
          nối cặp hoặc gõ đáp án. Tiến độ được lưu ngay trên máy.
        </p>
      </header>

      <div className="mb-10">
        <SearchBox cards={courseCards} />
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lessons.map((info) => (
          <LessonCard key={info.lesson} info={info} />
        ))}
      </section>
    </main>
  );
}
