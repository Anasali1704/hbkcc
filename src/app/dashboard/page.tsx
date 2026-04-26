import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type EnrollmentRow = {
  id: string;
  role: string;
  class_id: string;
  user_id: string;
  classes: { name: string } | { name: string }[] | null;
  profiles:
    | { email: string; role: string; full_name: string | null; phone: string | null }
    | { email: string; role: string; full_name: string | null; phone: string | null }[]
    | null;
};

type ClassRow = {
  id: string;
  name: string;
};

type SemesterRow = {
  id: string;
  class_id: string;
  name: string;
  sort_order: number;
};

type LessonRow = {
  id: string;
  class_id: string;
  semester_id: string | null;
  title: string;
  description: string | null;
  lesson_date: string;
};

type AttendanceRow = {
  id: string;
  lesson_id: string;
  user_id: string;
  status: "present" | "absent";
};

type ClassFileRow = {
  id: string;
  class_id: string;
  title: string;
  file_path: string;
  uploaded_by: string | null;
  created_at: string;
};

type LessonResourceRow = {
  id: string;
  lesson_id: string;
  type: "file" | "link";
  title: string;
  description: string | null;
  file_path: string | null;
  url: string | null;
  created_by: string | null;
  created_at: string;
};

type SemesterResourceRow = {
  id: string;
  semester_id: string;
  type: "file" | "link";
  title: string;
  description: string | null;
  file_path: string | null;
  url: string | null;
  created_by: string | null;
  created_at: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; semester?: string }>;
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

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!existingProfile) {
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      role: "student",
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .order("name", { ascending: true });

  const { data: semestersRaw } = await supabase
    .from("semesters")
    .select("*")
    .order("sort_order", { ascending: true });

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("email", { ascending: true });

  const { data: enrollmentsRaw } = await supabase.from("enrollments").select(`
    id,
    role,
    class_id,
    user_id,
    classes(name),
    profiles(email, role, full_name, phone)
  `);

  const { data: lessonsRaw } = await supabase
    .from("lessons")
    .select("*")
    .order("lesson_date", { ascending: true });

  const { data: attendanceRaw } = await supabase.from("attendance").select("*");

  const { data: classFilesRaw } = await supabase
    .from("class_files")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: lessonResourcesRaw } = await supabase
    .from("lesson_resources")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: semesterResourcesRaw } = await supabase
  .from("semester_resources")
  .select("*")
  .order("created_at", { ascending: false });  

  const enrollments = (enrollmentsRaw ?? []) as EnrollmentRow[];
  const classList = (classes ?? []) as ClassRow[];
  const semesters = (semestersRaw ?? []) as SemesterRow[];
  const lessons = (lessonsRaw ?? []) as LessonRow[];
  const attendance = (attendanceRaw ?? []) as AttendanceRow[];
  const classFiles = (classFilesRaw ?? []) as ClassFileRow[];
  const lessonResources = (lessonResourcesRaw ?? []) as LessonResourceRow[];
  const semesterResources = (semesterResourcesRaw ?? []) as SemesterResourceRow[];

  const myTeacherClasses = classList.filter((c) =>
    enrollments.some(
      (e) => e.class_id === c.id && e.user_id === currentUserId && e.role === "teacher"
    )
  );

  const myStudentClasses = classList.filter((c) =>
    enrollments.some(
      (e) => e.class_id === c.id && e.user_id === currentUserId && e.role === "student"
    )
  );

  const visibleClasses =
    profile?.role === "admin"
      ? classList
      : profile?.role === "teacher"
      ? myTeacherClasses
      : myStudentClasses;

  const selectedClassId =
    params.class ?? visibleClasses[0]?.id ?? classList[0]?.id ?? "";

  const semestersForClass = semesters.filter((s) => s.class_id === selectedClassId);

  const selectedSemesterId = params.semester ?? semestersForClass[0]?.id ?? "";

  const selectedClass = classList.find((c) => c.id === selectedClassId);
  const selectedSemester = semesters.find((s) => s.id === selectedSemesterId);

  async function createClass(formData: FormData) {
    "use server";

    const name = formData.get("name") as string;
    const supabase = await createClient();

    await supabase.from("classes").insert({ name });

    revalidatePath("/dashboard");
  }

  async function addStudentToClass(formData: FormData) {
    "use server";

    const userId = formData.get("userId") as string;
    const classId = formData.get("classId") as string;

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("class_id", classId)
      .eq("role", "student")
      .maybeSingle();

    if (!existing) {
      await supabase.from("enrollments").insert({
        user_id: userId,
        class_id: classId,
        role: "student",
      });
    }

    revalidatePath("/dashboard");
  }

  async function addTeacherToClass(formData: FormData) {
    "use server";

    const userId = formData.get("teacherId") as string;
    const classId = formData.get("teacherClassId") as string;

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("class_id", classId)
      .eq("role", "teacher")
      .maybeSingle();

    if (!existing) {
      await supabase.from("enrollments").insert({
        user_id: userId,
        class_id: classId,
        role: "teacher",
      });
    }

    revalidatePath("/dashboard");
  }

  async function createLesson(formData: FormData) {
    "use server";

    const classId = formData.get("lessonClassId") as string;
    const semesterId = formData.get("semesterId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const lessonDate = formData.get("lessonDate") as string;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("lessons").insert({
      class_id: classId,
      semester_id: semesterId || null,
      title,
      description: description || null,
      lesson_date: lessonDate,
      created_by: user.id,
    });

    revalidatePath("/dashboard");
  }

  async function markAttendance(formData: FormData) {
    "use server";

    const lessonId = formData.get("lessonId") as string;
    const userId = formData.get("userId") as string;
    const status = formData.get("status") as string;

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("attendance")
      .select("id")
      .eq("lesson_id", lessonId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase.from("attendance").update({ status }).eq("id", existing.id);
    } else {
      await supabase.from("attendance").insert({
        lesson_id: lessonId,
        user_id: userId,
        status,
      });
    }

    revalidatePath("/dashboard");
  }

  async function uploadClassFile(formData: FormData) {
    "use server";

    try {
      const classId = formData.get("fileClassId") as string;
      const title = formData.get("fileTitle") as string;
      const file = formData.get("file") as File | null;

      if (!file || file.size === 0) return;

      const supabase = await createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const fileExt = file.name.split(".").pop() || "bin";
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${classId}/${fileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("class-files")
        .upload(filePath, fileBuffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error("UPLOAD ERROR:", uploadError);
        return;
      }

      const { error: insertError } = await supabase.from("class_files").insert({
        class_id: classId,
        title,
        file_path: filePath,
        uploaded_by: user.id,
      });

      if (insertError) {
        console.error("DB INSERT ERROR:", insertError);
        return;
      }

      revalidatePath("/dashboard");
    } catch (error) {
      console.error("UPLOAD CLASS FILE FAILED:", error);
      throw error;
    }
  }

  async function uploadLessonFile(formData: FormData) {
    "use server";

    try {
      const lessonId = formData.get("lessonId") as string;
      const title = formData.get("resourceTitle") as string;
      const description = formData.get("resourceDescription") as string;
      const file = formData.get("resourceFile") as File | null;

      if (!file || file.size === 0) return;

      const supabase = await createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const fileExt = file.name.split(".").pop() || "bin";
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `lessons/${lessonId}/${fileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("class-files")
        .upload(filePath, fileBuffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error("LESSON FILE UPLOAD ERROR:", uploadError);
        return;
      }

      const { error: insertError } = await supabase.from("lesson_resources").insert({
        lesson_id: lessonId,
        type: "file",
        title,
        description: description || null,
        file_path: filePath,
        url: null,
        created_by: user.id,
      });

      if (insertError) {
        console.error("LESSON RESOURCE INSERT ERROR:", insertError);
        return;
      }

      revalidatePath("/dashboard");
    } catch (error) {
      console.error("UPLOAD LESSON FILE FAILED:", error);
      throw error;
    }
  }

  async function deleteLessonResource(formData: FormData) {
    "use server";

    const resourceId = formData.get("resourceId") as string;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: resource } = await supabase
      .from("lesson_resources")
      .select("*")
      .eq("id", resourceId)
      .single();

    if (!resource) return;

    if (resource.type === "file" && resource.file_path) {
      await supabase.storage.from("class-files").remove([resource.file_path]);
    }

    const { error } = await supabase
      .from("lesson_resources")
      .delete()
      .eq("id", resourceId);

    if (error) {
      console.error("DELETE RESOURCE ERROR:", error);
      return;
    }

    revalidatePath("/dashboard");
  }

  async function deleteClassFile(formData: FormData) {
    "use server";

    const fileId = formData.get("fileId") as string;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: file, error: fileError } = await supabase
      .from("class_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      console.error("DELETE CLASS FILE FETCH ERROR:", fileError);
      return;
    }

    if (file.file_path) {
      await supabase.storage.from("class-files").remove([file.file_path]);
    }

    const { error } = await supabase.from("class_files").delete().eq("id", fileId);

    if (error) {
      console.error("DELETE CLASS FILE DB ERROR:", error);
      return;
    }

    revalidatePath("/dashboard");
  }

  async function updateLesson(formData: FormData) {
    "use server";

    const lessonId = formData.get("lessonId") as string;
    const title = formData.get("editTitle") as string;
    const description = formData.get("editDescription") as string;
    const lessonDate = formData.get("editLessonDate") as string;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("lessons")
      .update({
        title,
        description: description || null,
        lesson_date: lessonDate,
      })
      .eq("id", lessonId);

    if (error) {
      console.error("UPDATE LESSON ERROR:", error);
      return;
    }

    revalidatePath("/dashboard");
  }

  async function deleteLesson(formData: FormData) {
    "use server";

    const lessonId = formData.get("lessonId") as string;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);

    if (error) {
      console.error("DELETE LESSON ERROR:", error);
      return;
    }

    revalidatePath("/dashboard");
  }

  async function addLessonLink(formData: FormData) {
    "use server";

    const lessonId = formData.get("lessonId") as string;
    const title = formData.get("linkTitle") as string;
    const description = formData.get("linkDescription") as string;
    const url = formData.get("linkUrl") as string;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("lesson_resources").insert({
      lesson_id: lessonId,
      type: "link",
      title,
      description: description || null,
      file_path: null,
      url,
      created_by: user.id,
    });

    revalidatePath("/dashboard");
  }

  async function uploadSemesterFile(formData: FormData) {
  "use server";

  const semesterId = formData.get("semesterId") as string;
  const title = formData.get("semesterResourceTitle") as string;
  const description = formData.get("semesterResourceDescription") as string;
  const file = formData.get("semesterResourceFile") as File | null;

  if (!file || file.size === 0) return;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const fileExt = file.name.split(".").pop() || "bin";
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `semesters/${semesterId}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from("class-files")
    .upload(filePath, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("SEMESTER FILE UPLOAD ERROR:", uploadError);
    return;
  }

  const { error: insertError } = await supabase.from("semester_resources").insert({
    semester_id: semesterId,
    type: "file",
    title,
    description: description || null,
    file_path: filePath,
    url: null,
    created_by: user.id,
  });

  if (insertError) {
    console.error("SEMESTER RESOURCE INSERT ERROR:", insertError);
    return;
  }

  revalidatePath("/dashboard");
}

async function addSemesterLink(formData: FormData) {
  "use server";

  const semesterId = formData.get("semesterId") as string;
  const title = formData.get("semesterLinkTitle") as string;
  const description = formData.get("semesterLinkDescription") as string;
  const url = formData.get("semesterLinkUrl") as string;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("semester_resources").insert({
    semester_id: semesterId,
    type: "link",
    title,
    description: description || null,
    file_path: null,
    url,
    created_by: user.id,
  });

  revalidatePath("/dashboard");
}

async function deleteSemesterResource(formData: FormData) {
  "use server";

  const resourceId = formData.get("semesterResourceId") as string;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: resource } = await supabase
    .from("semester_resources")
    .select("*")
    .eq("id", resourceId)
    .single();

  if (!resource) return;

  if (resource.type === "file" && resource.file_path) {
    await supabase.storage.from("class-files").remove([resource.file_path]);
  }

  await supabase.from("semester_resources").delete().eq("id", resourceId);

  revalidatePath("/dashboard");
}


  function getProfile(profileValue: EnrollmentRow["profiles"]) {
    if (Array.isArray(profileValue)) return profileValue[0];
    return profileValue;
  }

  function getDisplayName(profileValue: EnrollmentRow["profiles"]) {
    const profile = getProfile(profileValue);
    return profile?.full_name || profile?.email || "Ukendt bruger";
  }

  function getDisplayPhone(profileValue: EnrollmentRow["profiles"]) {
    const profile = getProfile(profileValue);
    return profile?.phone || "";
  }

  function renderPerson(profileValue: EnrollmentRow["profiles"]) {
    return (
      <div>
        <div className="font-medium text-stone-900">{getDisplayName(profileValue)}</div>
        {getDisplayPhone(profileValue) && (
          <div className="text-sm text-stone-500">{getDisplayPhone(profileValue)}</div>
        )}
      </div>
    );
  }

  function renderFileList(classId: string) {
    const filesForClass = classFiles.filter((file) => file.class_id === classId);
    const canDelete = profile?.role === "admin" || profile?.role === "teacher";

    if (filesForClass.length === 0) {
      return <p className="mt-2 text-sm text-stone-500">Ingen filer endnu.</p>;
    }

    return (
      <ul className="mt-3 space-y-3">
        {filesForClass.map((file) => (
          <li
            key={file.id}
            className="flex items-start justify-between gap-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
          >
            <div className="font-medium text-stone-900">{file.title}</div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/files?path=${encodeURIComponent(file.file_path)}`}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#8f1d22] hover:bg-[#f3e4e1]"
              >
                Download
              </a>

              {canDelete && (
                <form action={deleteClassFile}>
                  <input type="hidden" name="fileId" value={file.id} />
                  <button className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white">
                    Slet
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  function renderLessonResources(lessonId: string) {
    const resources = lessonResources.filter((r) => r.lesson_id === lessonId);
    const canDelete = profile?.role === "admin" || profile?.role === "teacher";

    if (resources.length === 0) {
      return <p className="mt-2 text-sm text-stone-500">Ingen materialer endnu.</p>;
    }

    return (
      <ul className="mt-3 space-y-3">
        {resources.map((resource) => (
          <li
            key={resource.id}
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-stone-900">{resource.title}</div>

                {resource.description && (
                  <div className="mt-1 text-sm text-stone-500">
                    {resource.description}
                  </div>
                )}

                <div className="mt-3">
                  {resource.type === "file" && resource.file_path && (
                    <a
                      href={`/api/files?path=${encodeURIComponent(resource.file_path)}`}
                      className="text-sm font-medium text-[#8f1d22] hover:underline"
                    >
                      Download fil
                    </a>
                  )}

                  {resource.type === "link" && resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-[#8f1d22] hover:underline"
                    >
                      Åbn link
                    </a>
                  )}
                </div>
              </div>

              {canDelete && (
                <form action={deleteLessonResource}>
                  <input type="hidden" name="resourceId" value={resource.id} />
                  <button className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white">
                    Slet
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

 function renderSemesterResources(semesterId: string) {
  const resources = semesterResources.filter((r) => r.semester_id === semesterId);
  const canDelete = profile?.role === "admin" || profile?.role === "teacher";

  if (resources.length === 0) {
    return <p className="mt-2 text-sm text-stone-500">Ingen semester-materialer endnu.</p>;
  }

  return (
    <ul className="mt-3 space-y-3">
      {resources.map((resource) => (
        <li
          key={resource.id}
          className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-medium text-stone-900">{resource.title}</div>

              {resource.description && (
                <div className="mt-1 text-sm text-stone-500">
                  {resource.description}
                </div>
              )}

              <div className="mt-3">
                {resource.type === "file" && resource.file_path && (
                  <a
                    href={`/api/files?path=${encodeURIComponent(resource.file_path)}`}
                    className="text-sm font-medium text-[#8f1d22] hover:underline"
                  >
                    Download fil
                  </a>
                )}

                {resource.type === "link" && resource.url && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-[#8f1d22] hover:underline"
                  >
                    Åbn link
                  </a>
                )}
              </div>
            </div>

            {canDelete && (
              <form action={deleteSemesterResource}>
                <input type="hidden" name="semesterResourceId" value={resource.id} />
                <button className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white">
                  Slet
                </button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}


  function renderLessonList(classId: string) {
    const classLessons = lessons.filter(
      (lesson) =>
        lesson.class_id === classId &&
        lesson.semester_id === selectedSemesterId
    );

    if (classLessons.length === 0) {
      return <p className="mt-2 text-sm text-stone-500">Ingen lektioner endnu.</p>;
    }

    return (
      <div className="mt-3 space-y-5">
        {classLessons.map((lesson) => {
          const classStudents = enrollments.filter(
            (e) => e.class_id === classId && e.role === "student"
          );

          return (
            <div
              key={lesson.id}
              className="rounded-3xl border border-stone-200 bg-stone-50 px-5 py-5"
            >
              <div>
                <div className="text-lg font-semibold text-stone-900">
                  {lesson.title}
                </div>
                <div className="text-sm text-stone-500">{lesson.lesson_date}</div>
              </div>

              {lesson.description && (
                <div className="mt-3 text-sm leading-6 text-stone-700">
                  {lesson.description}
                </div>
              )}

              {(profile?.role === "admin" || profile?.role === "teacher") && (
                <div className="mt-5 space-y-3 border-t border-stone-200 pt-4">
                  <h4 className="text-sm font-semibold text-stone-900">
                    Redigér lektion
                  </h4>

                  <form action={updateLesson} className="grid gap-3">
                    <input type="hidden" name="lessonId" value={lesson.id} />

                    <input
                      name="editTitle"
                      defaultValue={lesson.title}
                      required
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                    />

                    <input
                      type="date"
                      name="editLessonDate"
                      defaultValue={lesson.lesson_date}
                      required
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                    />

                    <textarea
                      name="editDescription"
                      defaultValue={lesson.description ?? ""}
                      rows={3}
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                    />

                    <button className="w-fit rounded-xl bg-[#8f1d22] px-4 py-2.5 text-sm font-semibold text-white">
                      Gem ændringer
                    </button>
                  </form>

                  <form action={deleteLesson}>
                    <input type="hidden" name="lessonId" value={lesson.id} />
                    <button className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white">
                      Slet lektion
                    </button>
                  </form>
                </div>
              )}

              <div className="mt-5">
                <h4 className="mb-2 text-sm font-semibold text-stone-900">Fravær</h4>

                {classStudents.length === 0 ? (
                  <p className="text-sm text-stone-500">Ingen elever på holdet</p>
                ) : (
                  <ul className="space-y-2">
                    {classStudents.map((student) => {
                      const studentProfile = Array.isArray(student.profiles)
                        ? student.profiles[0]
                        : student.profiles;

                      const studentName =
                        studentProfile?.full_name || studentProfile?.email;
                      const studentPhone = studentProfile?.phone || "";

                      const attendanceRow = attendance.find(
                        (a) =>
                          a.lesson_id === lesson.id &&
                          a.user_id === student.user_id
                      );

                      const status = attendanceRow?.status;

                      const canEditAttendance =
                        profile?.role === "admin" || profile?.role === "teacher";

                      const isOwnStudentRow =
                        profile?.role === "student" &&
                        student.user_id === currentUserId;

                      if (profile?.role === "student" && !isOwnStudentRow) {
                        return null;
                      }

                      return (
                        <li
                          key={student.id}
                          className="rounded-2xl border border-stone-200 bg-white px-4 py-3"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="font-medium text-stone-900">
                                {studentName}
                              </div>
                              {studentPhone && (
                                <div className="mt-1 text-sm text-stone-500">
                                  {studentPhone}
                                </div>
                              )}
                              <div className="mt-1 text-sm text-stone-500">
                                Status:{" "}
                                {status === "present"
                                  ? "Tilstede"
                                  : status === "absent"
                                  ? "Fraværende"
                                  : "Ikke registreret"}
                              </div>
                            </div>

                            {canEditAttendance && (
                              <div className="flex gap-2">
                                <form action={markAttendance}>
                                  <input
                                    type="hidden"
                                    name="lessonId"
                                    value={lesson.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="userId"
                                    value={student.user_id}
                                  />
                                  <input
                                    type="hidden"
                                    name="status"
                                    value="present"
                                  />
                                  <button className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white">
                                    Tilstede
                                  </button>
                                </form>

                                <form action={markAttendance}>
                                  <input
                                    type="hidden"
                                    name="lessonId"
                                    value={lesson.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="userId"
                                    value={student.user_id}
                                  />
                                  <input
                                    type="hidden"
                                    name="status"
                                    value="absent"
                                  />
                                  <button className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white">
                                    Fravær
                                  </button>
                                </form>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="mt-5">
                <h4 className="mb-2 text-sm font-semibold text-stone-900">
                  Materialer
                </h4>
                {renderLessonResources(lesson.id)}
              </div>

              {(profile?.role === "admin" || profile?.role === "teacher") && (
                <div className="mt-5 space-y-5">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-stone-900">
                      Upload fil til lektion
                    </h4>
                    <form action={uploadLessonFile} className="grid gap-3">
                      <input type="hidden" name="lessonId" value={lesson.id} />

                      <input
                        name="resourceTitle"
                        placeholder="Titel"
                        required
                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                      />

                      <textarea
                        name="resourceDescription"
                        placeholder="Beskrivelse"
                        rows={3}
                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                      />

                      <input
                        type="file"
                        name="resourceFile"
                        required
                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                      />

                      <button className="w-fit rounded-xl bg-[#8f1d22] px-4 py-2.5 text-sm font-semibold text-white">
                        Upload fil
                      </button>
                    </form>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-stone-900">
                      Tilføj YouTube/link
                    </h4>
                    <form action={addLessonLink} className="grid gap-3">
                      <input type="hidden" name="lessonId" value={lesson.id} />

                      <input
                        name="linkTitle"
                        placeholder="Titel"
                        required
                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                      />

                      <textarea
                        name="linkDescription"
                        placeholder="Beskrivelse"
                        rows={3}
                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                      />

                      <input
                        name="linkUrl"
                        type="url"
                        placeholder="https://youtube.com/..."
                        required
                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                      />

                      <button className="w-fit rounded-xl bg-[#8f1d22] px-4 py-2.5 text-sm font-semibold text-white">
                        Tilføj link
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-96px)] bg-[#f6f3ef]">
      <div className="mx-auto max-w-[1500px] px-6 py-8">
        <div className="rounded-[28px] border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-stone-900">
            Lektionsplan
          </h1>

          <p className="mb-8 text-stone-500">
            HBKCC Undervisning · Pre Mahaad
          </p>

          <div className="mb-6 flex flex-wrap gap-3">
            {visibleClasses.map((c) => (
              <a
                key={c.id}
                href={`/dashboard?class=${c.id}`}
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
                href={`/dashboard?class=${selectedClassId}&semester=${s.id}`}
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
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Rolle:</strong> {profile?.role}
            </p>
            {selectedClass && (
              <p>
                <strong>Valgt hold:</strong> {selectedClass.name}
              </p>
            )}
            {selectedSemester && (
              <p>
                <strong>Valgt semester:</strong> {selectedSemester.name}
              </p>
            )}
          </div>

          {profile?.role === "admin" && (
            <div className="space-y-10">
              <section className="rounded-3xl border border-stone-200 bg-stone-50 p-6">
                <h2 className="mb-4 text-xl font-semibold text-stone-900">
                  Opret hold
                </h2>
                <form action={createClass} className="flex gap-3">
                  <input
                    name="name"
                    placeholder="Navn på hold"
                    required
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                  />
                  <button className="shrink-0 rounded-xl bg-[#8f1d22] px-4 py-2.5 text-sm font-semibold text-white">
                    Opret
                  </button>
                </form>
              </section>

              <section className="rounded-3xl border border-stone-200 bg-stone-50 p-6">
                <h2 className="mb-4 text-xl font-semibold text-stone-900">
                  Tilføj elev til hold
                </h2>
                <form action={addStudentToClass} className="grid gap-3 md:grid-cols-3">
                  <select
                    name="userId"
                    required
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                  >
                    <option value="">Vælg elev</option>
                    {users
                      ?.filter((u) => u.role === "student")
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name
                            ? `${u.full_name} · ${u.phone || u.email}`
                            : u.email}
                        </option>
                      ))}
                  </select>

                  <select
                    name="classId"
                    required
                    defaultValue={selectedClassId}
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                  >
                    <option value="">Vælg hold</option>
                    {classList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <button className="rounded-xl bg-[#8f1d22] px-4 py-2.5 text-sm font-semibold text-white">
                    Tilføj elev
                  </button>
                </form>
              </section>

              <section className="rounded-3xl border border-stone-200 bg-stone-50 p-6">
                <h2 className="mb-4 text-xl font-semibold text-stone-900">
                  Tilføj underviser til hold
                </h2>
                <form action={addTeacherToClass} className="grid gap-3 md:grid-cols-3">
                  <select
                    name="teacherId"
                    required
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                  >
                    <option value="">Vælg underviser</option>
                    {users
                      ?.filter((u) => u.role === "teacher")
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name
                            ? `${u.full_name} · ${u.phone || u.email}`
                            : u.email}
                        </option>
                      ))}
                  </select>

                  <select
                    name="teacherClassId"
                    required
                    defaultValue={selectedClassId}
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                  >
                    <option value="">Vælg hold</option>
                    {classList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <button className="rounded-xl bg-[#8f1d22] px-4 py-2.5 text-sm font-semibold text-white">
                    Tilføj underviser
                  </button>
                </form>
              </section>
            </div>
          )}

          {(profile?.role === "admin" || profile?.role === "teacher") && selectedClassId && (
            <section className="mt-10 rounded-3xl border border-stone-200 bg-stone-50 p-6">
              <h2 className="mb-4 text-xl font-semibold text-stone-900">
                Opret lektion i {selectedSemester?.name ?? "valgt semester"}
              </h2>

              <form action={createLesson} className="grid gap-3">
                <input type="hidden" name="lessonClassId" value={selectedClassId} />
                <input type="hidden" name="semesterId" value={selectedSemesterId} />

                <input
                  name="title"
                  placeholder="Lektionstitel"
                  required
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                />

                <input
                  type="date"
                  name="lessonDate"
                  required
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                />

                <textarea
                  name="description"
                  placeholder="Beskrivelse / lektionsplan"
                  rows={4}
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                />

                <button className="w-fit rounded-xl bg-[#8f1d22] px-4 py-2.5 text-sm font-semibold text-white">
                  Opret lektion
                </button>
              </form>
            </section>
          )}

          {selectedClassId && (
            <section className="mt-10">
              <h2 className="mb-4 text-xl font-semibold text-stone-900">
                {selectedClass?.name ?? "Valgt hold"} ·{" "}
                {selectedSemester?.name ?? "Vælg semester"}
              </h2>
          
          {selectedSemesterId && (
  <div className="mb-6 rounded-3xl border border-stone-200 bg-stone-50 p-6">
    <h3 className="font-semibold text-stone-900">Semester-materialer</h3>
    {renderSemesterResources(selectedSemesterId)}

    {(profile?.role === "admin" || profile?.role === "teacher") && (
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-semibold text-stone-900">
            Upload fil til semester
          </h4>

          <form action={uploadSemesterFile} className="grid gap-3">
            <input type="hidden" name="semesterId" value={selectedSemesterId} />

            <input
              name="semesterResourceTitle"
              placeholder="Titel"
              required
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
            />

            <textarea
              name="semesterResourceDescription"
              placeholder="Beskrivelse"
              rows={3}
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
            />

            <input
              type="file"
              name="semesterResourceFile"
              required
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
            />

            <button className="w-fit rounded-xl bg-[#8f1d22] px-4 py-2.5 text-sm font-semibold text-white">
              Upload fil
            </button>
          </form>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-stone-900">
            Tilføj link til semester
          </h4>

          <form action={addSemesterLink} className="grid gap-3">
            <input type="hidden" name="semesterId" value={selectedSemesterId} />

            <input
              name="semesterLinkTitle"
              placeholder="Titel"
              required
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
            />

            <textarea
              name="semesterLinkDescription"
              placeholder="Beskrivelse"
              rows={3}
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
            />

            <input
              name="semesterLinkUrl"
              type="url"
              placeholder="https://..."
              required
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
            />

            <button className="w-fit rounded-xl bg-[#8f1d22] px-4 py-2.5 text-sm font-semibold text-white">
              Tilføj link
            </button>
          </form>
        </div>
      </div>
    )}
  </div>
)}
              <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6">
                <h3 className="font-semibold text-stone-900">Lektionsplan</h3>
                {renderLessonList(selectedClassId)}
              </div>

              <div className="mt-6 rounded-3xl border border-stone-200 bg-stone-50 p-6">
                <h3 className="font-semibold text-stone-900">Filer</h3>
                {renderFileList(selectedClassId)}

                {(profile?.role === "admin" || profile?.role === "teacher") && (
                  <div className="mt-5">
                    <h3 className="mb-2 font-semibold text-stone-900">
                      Upload fil til hold
                    </h3>

                    <form action={uploadClassFile} className="grid gap-3">
                      <input type="hidden" name="fileClassId" value={selectedClassId} />

                      <input
                        name="fileTitle"
                        placeholder="Filens titel"
                        required
                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                      />

                      <input
                        type="file"
                        name="file"
                        required
                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900"
                      />

                      <button className="w-fit rounded-xl bg-[#8f1d22] px-4 py-2.5 text-sm font-semibold text-white">
                        Upload fil
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </section>
          )}

          {profile?.role === "admin" && selectedClassId && (
            <section className="mt-10">
              <h2 className="mb-4 text-xl font-semibold text-stone-900">
                Elever og undervisere på valgt hold
              </h2>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6">
                  <h3 className="mb-3 font-semibold text-stone-900">Undervisere</h3>
                  <ul className="space-y-2">
                    {enrollments
                      .filter((e) => e.class_id === selectedClassId && e.role === "teacher")
                      .map((e) => (
                        <li key={e.id}>{renderPerson(e.profiles)}</li>
                      ))}
                  </ul>
                </div>

                <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6">
                  <h3 className="mb-3 font-semibold text-stone-900">Elever</h3>
                  <ul className="space-y-2">
                    {enrollments
                      .filter((e) => e.class_id === selectedClassId && e.role === "student")
                      .map((e) => (
                        <li key={e.id}>{renderPerson(e.profiles)}</li>
                      ))}
                  </ul>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}