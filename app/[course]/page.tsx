import Link from "next/link";
import { notFound } from "next/navigation";
import LessonCard from "@/components/LessonCard";
import SearchBox from "@/components/SearchBox";
import { COURSES, getCourse } from "@/lib/courses";
import { getLessons, countCards, getCards } from "@/lib/vocab";

export function generateStaticParams() {
  return COURSES.map((c) => ({ course: c.id }));
}

const FEATURES = [
  { id: "vocab",   label: "Từ vựng",  ready: true  },
  { id: "grammar", label: "Ngữ pháp", ready: false },
  { id: "kanji",   label: "Kanji",    ready: false },
] as const;

export default function CoursePage({ params }: { params: { course: string } }) {
  const course = getCourse(params.course);
  if (!course) notFound();

  const lessons = getLessons(course.id);
  const total = countCards(course.id);
  const courseCards = lessons.flatMap((info) => getCards(course.id, info.lesson));

  return (
    <main className="mx-auto max-w-5xl px-5 pb-10 sm:pb-16">
      <header className="mb-8 sm:mb-12">
        <Link href="/" className="text-sm font-semibold text-indigo hover:underline">
          ← Tất cả cấp độ
        </Link>
        <p className="mb-2 mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-shu">
          {course.title} · {course.label}
        </p>
        <h1 className="font-jp text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          {course.label}
        </h1>
        <p className="mt-3 max-w-xl text-sub">
          Chọn nội dung muốn học: từ vựng, ngữ pháp hoặc kanji.
        </p>
      </header>

      {/* Feature tabs */}
      <div className="mb-10 flex gap-2 border-b border-line pb-0">
        {FEATURES.map((f) => (
          f.ready ? (
            <div
              key={f.id}
              className="flex items-center gap-1.5 border-b-2 border-indigo px-4 pb-3 text-sm font-semibold text-indigo"
            >
              {f.label}
            </div>
          ) : (
            <div
              key={f.id}
              className="flex items-center gap-1.5 border-b-2 border-transparent px-4 pb-3 text-sm font-semibold text-sub/50"
            >
              {f.label}
              <span className="rounded-full bg-line px-1.5 py-0.5 text-[10px] font-semibold text-sub">
                Sắp có
              </span>
            </div>
          )
        ))}
      </div>

      {/* Vocab content */}
      <p className="mb-4 text-sm text-sub">{total} thẻ · {lessons.length} bài</p>

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
