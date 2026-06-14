export interface CourseInfo {
  id: string;     // "n5", "n4", "n3", "n2"
  label: string;  // "N5"
  title: string;  // "みんなの日本語 I"
}

/**
 * Add new courses here when data is ready.
 * Routing, lesson lists, and study pages are generated automatically
 * from this array — no other changes needed in app/ or components/.
 */
export const COURSES: CourseInfo[] = [
  { id: "n5", label: "N5", title: "みんなの日本語 I" },
  // { id: "n4", label: "N4", title: "みんなの日本語 II" },
  // { id: "n3", label: "N3", title: "中級へ行こう" },
];

export function getCourse(id: string): CourseInfo | undefined {
  return COURSES.find((c) => c.id === id);
}
