import Link from "next/link";
import { COURSES } from "@/lib/courses";
import { getLessons, countCards, getAllCards } from "@/lib/vocab";
import SearchBox from "@/components/SearchBox";

export default function Home() {
  const allCards = getAllCards();

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
      <header className="mb-8 sm:mb-12">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-shu">
          みんなの日本語 · Flashcards
        </p>
        <h1 className="font-jp text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Chọn cấp độ
        </h1>
        <p className="mt-3 max-w-xl text-sub">
          Học từ vựng &amp; mẫu câu bằng lật thẻ, trắc nghiệm, nối cặp hoặc gõ đáp án.
        </p>
        <div className="mt-4 flex max-w-xl items-start gap-2.5 rounded-xl border border-line bg-paper px-4 py-3 text-xs text-sub">
          <svg className="mt-0.5 shrink-0 text-sub/60" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>
            Tiến độ học được lưu trên trình duyệt này — sang trình duyệt hoặc thiết bị khác sẽ không giữ được dữ liệu.
            Tính năng đồng bộ tài khoản sẽ được phát triển trong tương lai.
          </span>
        </div>
      </header>

      {/* Search */}
      <div className="mb-10">
        <SearchBox cards={allCards} />
      </div>

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
