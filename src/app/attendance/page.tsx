import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { getRoleLabel } from "../../lib/roles";

type ProfileRow = {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  phone: string | null;
};

type ClassRow = {
  id: string;
  name: string;
  offer_id: string;
};

type OfferRow = {
  id: string;
  slug: string;
  name: string;
};

type SemesterRow = {
  id: string;
  class_id: string;
  name: string;
  sort_order: number;
};

type EnrollmentRow = {
  id: string;
  role: string;
  class_id: string;
  user_id: string;
  profiles: ProfileRow | ProfileRow[] | null;
};

type LessonRow = {
  id: string;
  class_id: string;
  semester_id: string | null;
  title: string;
  lesson_date: string;
};

type AttendanceRow = {
  id: string;
  lesson_id: string;
  user_id: string;
  status: "present" | "absent";
};

type ParentStudentRow = {
  id: string;
  parent_id: string;
  student_id: string;
};

function getProfile(profileValue: EnrollmentRow["profiles"]) {
  if (Array.isArray(profileValue)) return profileValue[0];
  return profileValue;
}

function getName(profile: ProfileRow | null | undefined) {
  return profile?.full_name || profile?.email || "Ukendt bruger";
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; semester?: string; tilbud?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect("/login");
  }

  const currentUserId = user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUserId)
    .single();

  const { data: classesRaw } = await supabase
    .from("classes")
    .select("*")
    .order("name", { ascending: true });

  const { data: semestersRaw } = await supabase
    .from("semesters")
    .select("*")
    .order("sort_order", { ascending: true });

  const { data: offersRaw } = await supabase
    .from("offers")
    .select("id, slug, name")
    .eq("active", true);

  const { data: enrollmentsRaw } = await supabase.from("enrollments").select(`
    id,
    role,
    class_id,
    user_id,
    profiles(id, email, role, full_name, phone)
  `);

  const { data: lessonsRaw } = await supabase
    .from("lessons")
    .select("*")
    .order("lesson_date", { ascending: true });

  const { data: attendanceRaw } = await supabase.from("attendance").select("*");

  const { data: parentStudentsRaw } = await supabase
    .from("parent_students")
    .select("*");

  const classList = (classesRaw ?? []) as ClassRow[];
  const offers = (offersRaw ?? []) as OfferRow[];
  const selectedOffer = offers.find((offer) => offer.slug === params.tilbud);

  if (!selectedOffer) {
    redirect("/tilbud");
  }

  const offerClasses = classList.filter(
    (classRow) => classRow.offer_id === selectedOffer.id
  );
  const semesters = (semestersRaw ?? []) as SemesterRow[];
  const enrollments = (enrollmentsRaw ?? []) as EnrollmentRow[];
  const lessons = (lessonsRaw ?? []) as LessonRow[];
  const attendance = (attendanceRaw ?? []) as AttendanceRow[];
  const parentStudents = (parentStudentsRaw ?? []) as ParentStudentRow[];
  const linkedStudentIds = parentStudents
    .filter((relation) => relation.parent_id === currentUserId)
    .map((relation) => relation.student_id);

  const myTeacherClasses = offerClasses.filter((c) =>
    enrollments.some(
      (e) => e.class_id === c.id && e.user_id === currentUserId && e.role === "teacher"
    )
  );

  const myStudentClasses = offerClasses.filter((c) =>
    enrollments.some(
      (e) => e.class_id === c.id && e.user_id === currentUserId && e.role === "student"
    )
  );

  const myParentClasses = offerClasses.filter((c) =>
    enrollments.some(
      (e) =>
        e.class_id === c.id &&
        e.role === "student" &&
        linkedStudentIds.includes(e.user_id)
    )
  );

  const visibleClasses =
    profile?.role === "admin"
      ? offerClasses
      : profile?.role === "teacher"
      ? myTeacherClasses
      : profile?.role === "parent"
      ? myParentClasses
      : myStudentClasses;

  const requestedClassId = params.class;

  const selectedClassId =
    requestedClassId && visibleClasses.some((c) => c.id === requestedClassId)
      ? requestedClassId
      : visibleClasses[0]?.id ?? "";

  const semestersForClass = semesters.filter((s) => s.class_id === selectedClassId);

  const requestedSemesterId = params.semester;

  const selectedSemesterId =
    requestedSemesterId &&
    semestersForClass.some((s) => s.id === requestedSemesterId)
      ? requestedSemesterId
      : semestersForClass[0]?.id ?? "";

  const selectedClass = classList.find((c) => c.id === selectedClassId);
  const selectedSemester = semesters.find((s) => s.id === selectedSemesterId);

  const semesterLessons = lessons
    .filter(
      (lesson) =>
        lesson.class_id === selectedClassId &&
        lesson.semester_id === selectedSemesterId
    )
    .sort((a, b) => {
      const dateCompare =
        new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime();

      if (dateCompare !== 0) return dateCompare;

      return a.title.localeCompare(b.title, "da", { numeric: true });
    });

  const studentsForClass = enrollments.filter(
    (e) => e.class_id === selectedClassId && e.role === "student"
  );

  const visibleStudents =
    profile?.role === "student"
      ? studentsForClass.filter((e) => e.user_id === currentUserId)
      : profile?.role === "parent"
      ? studentsForClass.filter((e) => linkedStudentIds.includes(e.user_id))
      : studentsForClass;

  const totalLessons = semesterLessons.length;

  const studentStats = visibleStudents.map((student) => {
    const studentProfile = getProfile(student.profiles);

    const rows = semesterLessons.map((lesson) => {
      const attendanceRow = attendance.find(
        (a) => a.lesson_id === lesson.id && a.user_id === student.user_id
      );

      return {
        lesson,
        status: attendanceRow?.status ?? null,
      };
    });

    const present = rows.filter((r) => r.status === "present").length;
    const absent = rows.filter((r) => r.status === "absent").length;
    const unregistered = rows.filter((r) => !r.status).length;

    const registered = present + absent;
    const absencePercent =
      registered > 0 ? Math.round((absent / registered) * 100) : 0;

    return {
      student,
      profile: studentProfile,
      rows,
      present,
      absent,
      unregistered,
      absencePercent,
    };
  });

  const totalAbsent = studentStats.reduce((sum, s) => sum + s.absent, 0);
  const totalPresent = studentStats.reduce((sum, s) => sum + s.present, 0);
  const totalRegistered = totalAbsent + totalPresent;
  const overallAbsencePercent =
    totalRegistered > 0 ? Math.round((totalAbsent / totalRegistered) * 100) : 0;

  return (
    <main className="min-h-[calc(100vh-96px)] bg-[#f6f3ef]">
      <div className="mx-auto max-w-[1500px] px-6 py-8">
        <div className="rounded-[28px] border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-stone-900">
            Fravær
          </h1>

          <p className="mb-8 text-stone-500">
            Statistik og overblik over fravær
          </p>

          {visibleClasses.length === 0 ? (
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6">
              <h2 className="mb-2 text-xl font-semibold text-stone-900">
                Du er ikke tilknyttet et hold endnu
              </h2>
              <p className="text-sm text-stone-500">
                Kontakt en administrator for at blive tilføjet til et hold.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap gap-3">
                {visibleClasses.map((c) => (
                  <a
                    key={c.id}
                    href={`/attendance?tilbud=${selectedOffer.slug}&class=${c.id}`}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      selectedClassId === c.id
                        ? "bg-[#8f1d22] text-white"
                        : "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {c.name}
                  </a>
                ))}
              </div>

              <div className="mb-8 flex flex-wrap gap-2">
                {semestersForClass.map((s) => (
                  <a
                    key={s.id}
                    href={`/attendance?tilbud=${selectedOffer.slug}&class=${selectedClassId}&semester=${s.id}`}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      selectedSemesterId === s.id
                        ? "bg-[#8f1d22] text-white"
                        : "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {s.name}
                  </a>
                ))}
              </div>

              <div className="mb-8 rounded-2xl bg-stone-50 px-5 py-4 text-stone-700">
                <p>
                  <strong>Hold:</strong> {selectedClass?.name ?? "Intet hold valgt"}
                </p>
                <p>
                  <strong>Semester:</strong>{" "}
                  {selectedSemester?.name ?? "Intet semester valgt"}
                </p>
                <p>
                  <strong>Rolle:</strong>{" "}
                  {getRoleLabel(profile?.role)}
                </p>
              </div>

              <div className="mb-8 grid gap-4 md:grid-cols-4">
                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                  <div className="text-sm text-stone-500">Lektioner</div>
                  <div className="mt-2 text-3xl font-bold text-stone-900">
                    {totalLessons}
                  </div>
                </div>

                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                  <div className="text-sm text-stone-500">Elever</div>
                  <div className="mt-2 text-3xl font-bold text-stone-900">
                    {visibleStudents.length}
                  </div>
                </div>

                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                  <div className="text-sm text-stone-500">Registreret fravær</div>
                  <div className="mt-2 text-3xl font-bold text-stone-900">
                    {totalAbsent}
                  </div>
                </div>

                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                  <div className="text-sm text-stone-500">Fraværsprocent</div>
                  <div className="mt-2 text-3xl font-bold text-[#8f1d22]">
                    {overallAbsencePercent}%
                  </div>
                </div>
              </div>

              <section className="rounded-3xl border border-stone-200 bg-stone-50 p-6">
                <h2 className="mb-4 text-xl font-semibold text-stone-900">
                  Fravær pr. elev
                </h2>

                {studentStats.length === 0 ? (
                  <p className="text-sm text-stone-500">
                    Der er ingen elever på dette hold.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-500">
                          <th className="py-3 pr-4 font-medium">Elev</th>
                          <th className="py-3 pr-4 font-medium">Telefon</th>
                          <th className="py-3 pr-4 font-medium">Tilstede</th>
                          <th className="py-3 pr-4 font-medium">Fravær</th>
                          <th className="py-3 pr-4 font-medium">Ikke registreret</th>
                          <th className="py-3 pr-4 font-medium">Fravær %</th>
                        </tr>
                      </thead>

                      <tbody>
                        {studentStats.map((s) => (
                          <tr key={s.student.id} className="border-b border-stone-200">
                            <td className="py-3 pr-4 font-medium text-stone-900">
                              {getName(s.profile)}
                            </td>
                            <td className="py-3 pr-4 text-stone-600">
                              {s.profile?.phone || "-"}
                            </td>
                            <td className="py-3 pr-4 text-stone-700">
                              {s.present}
                            </td>
                            <td className="py-3 pr-4 text-stone-700">
                              {s.absent}
                            </td>
                            <td className="py-3 pr-4 text-stone-700">
                              {s.unregistered}
                            </td>
                            <td className="py-3 pr-4 font-semibold text-[#8f1d22]">
                              {s.absencePercent}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="mt-8 rounded-3xl border border-stone-200 bg-stone-50 p-6">
                <h2 className="mb-4 text-xl font-semibold text-stone-900">
                  Detaljer pr. lektion
                </h2>

                {studentStats.map((s) => (
                  <div
                    key={s.student.id}
                    className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 last:mb-0"
                  >
                    <h3 className="mb-3 font-semibold text-stone-900">
                      {getName(s.profile)}
                    </h3>

                    {s.rows.length === 0 ? (
                      <p className="text-sm text-stone-500">
                        Ingen lektioner i dette semester.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {s.rows.map((row) => (
                          <li
                            key={row.lesson.id}
                            className="flex flex-col justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 md:flex-row md:items-center"
                          >
                            <div>
                              <div className="font-medium text-stone-900">
                                {row.lesson.title}
                              </div>
                              <div className="text-sm text-stone-500">
                                {row.lesson.lesson_date}
                              </div>
                            </div>

                            <div
                              className={`rounded-full px-3 py-1 text-sm font-medium ${
                                row.status === "present"
                                  ? "bg-green-100 text-green-700"
                                  : row.status === "absent"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-stone-200 text-stone-600"
                              }`}
                            >
                              {row.status === "present"
                                ? "Tilstede"
                                : row.status === "absent"
                                ? "Fraværende"
                                : "Ikke registreret"}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
