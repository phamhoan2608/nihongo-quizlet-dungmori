import Link from "next/link";
import { COURSES } from "@/lib/courses";
import { getLessons, countCards } from "@/lib/vocab";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
      <header className="mb-10 sm:mb-14">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-shu">
          みんなの日本語 · Flashcards
        </p>
        <h1 className="font-jp text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Chọn cấp độ
        </h1>
        <p className="mt-3 max-w-xl text-sub">
          Học từ vựng &amp; mẫu câu bằng lật thẻ, trắc nghiệm, nối cặp hoặc gõ đáp án.
          Tiến độ được lưu ngay trên máy.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COURSES.map((course) => {
          const lessons = getLessons(course.id);
          const total = countCards(course.id);
          return (
            <Link
              key={course.id}
              href={`/${course.id}`}
              className="group flex flex-col rounded-2xl border border-line bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-sub">
                    JLPT
                  </p>
                  <p className="font-jp text-4xl font-bold leading-none text-ink">
                    {course.label}
                  </p>
                </div>
                <span className="rounded-full bg-indigo-soft px-2.5 py-1 text-xs font-semibold text-indigo">
                  {total} thẻ
                </span>
              </div>

              <p className="mt-2 font-jp text-sm text-sub">{course.title}</p>

              <p className="mt-4 text-sm text-sub">
                {lessons.length} bài
              </p>

              <p className="mt-6 text-sm font-semibold text-indigo transition group-hover:underline">
                Vào học →
              </p>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
