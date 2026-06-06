import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nlbsuxxogzbyegtknpxg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYnN1eHhvZ3pieWVndGtucHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MTAzNzcsImV4cCI6MjA4NjA4NjM3N30.3huRqv7Y0cq1rL0gX_wT3rl4DFJndqRVqLFv_fsAf3o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('Logging in...');
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'beaconryk@gmail.com',
    password: 'Principal888'
  });

  const schoolId = '70b40b4e-ae36-4c1e-82b0-61e08dc5d4d8';
  const classSectionId = '6b7b33b9-f72d-49cf-87b5-19728955bfc1'; // Class 1A

  // Fetch school data
  const [
    sectionsRes,
    subjectsRes,
    teachersRes,
    periodsRes,
    sectionSubjectsRes,
    subjectAssignmentsRes,
    generalAssignmentsRes,
    existingEntriesRes,
  ] = await Promise.all([
    supabase
      .from("class_sections")
      .select("id, name, room, class_id, academic_classes(name)")
      .eq("school_id", schoolId),
    supabase
      .from("subjects")
      .select("id, name")
      .eq("school_id", schoolId),
    supabase
      .from("user_roles")
      .select("user_id") // Fetch user_roles user_id
      .eq("school_id", schoolId)
      .eq("role", "teacher"),
    supabase
      .from("timetable_periods")
      .select("*")
      .eq("school_id", schoolId)
      .order("sort_order"),
    supabase
      .from("class_section_subjects")
      .select("class_section_id, subject_id")
      .eq("school_id", schoolId),
    supabase
      .from("teacher_subject_assignments")
      .select("teacher_user_id, class_section_id, subject_id")
      .eq("school_id", schoolId),
    supabase
      .from("teacher_assignments")
      .select("teacher_user_id, class_section_id, subject_id")
      .eq("school_id", schoolId),
    supabase
      .from("timetable_entries")
      .select("id, day_of_week, period_id, subject_name, teacher_user_id, room, class_section_id")
      .eq("school_id", schoolId),
  ]);

  const sections = sectionsRes.data || [];
  const subjects = subjectsRes.data || [];
  const teacherUserIds = (teachersRes.data || []).map(r => r.user_id);
  const periods = periodsRes.data || [];

  // Fetch profiles for teachers
  let teachers = [];
  if (teacherUserIds.length > 0) {
    const profilesRes = await supabase.from('profiles').select('id, display_name').in('id', teacherUserIds);
    teachers = (profilesRes.data || []).map(p => ({
      user_id: p.id,
      profiles: { display_name: p.display_name }
    }));
  }

  // Map teacher display name
  const teacherNameMap = new Map();
  teachers.forEach((t) => {
    const name = t.profiles?.display_name || t.user_id;
    teacherNameMap.set(t.user_id, name);
  });

  // Merge subject assignments
  const mergedAssignments = [];
  const seenAssignments = new Set();

  const addAssignment = (teacherId, sectionId, subjectId) => {
    if (!teacherId || !sectionId || !subjectId) return;
    const key = `${teacherId}:${sectionId}:${subjectId}`;
    if (seenAssignments.has(key)) return;
    seenAssignments.add(key);
    mergedAssignments.push({ teacherId, sectionId, subjectId });
  };

  (subjectAssignmentsRes.data || []).forEach((a) => {
    addAssignment(a.teacher_user_id, a.class_section_id, a.subject_id);
  });
  (generalAssignmentsRes.data || []).forEach((a) => {
    addAssignment(a.teacher_user_id, a.class_section_id, a.subject_id);
  });

  // Map which subjects are offered in each section
  const sectionSubjectsMap = new Map();
  (sectionSubjectsRes.data || []).forEach((ss) => {
    const subject = subjects.find((s) => s.id === ss.subject_id);
    if (subject) {
      const list = sectionSubjectsMap.get(ss.class_section_id) || [];
      list.push(subject.name);
      sectionSubjectsMap.set(ss.class_section_id, list);
    }
  });

  // Also include subjects that have teacher assignments in that section
  mergedAssignments.forEach((a) => {
    const subject = subjects.find((s) => s.id === a.subjectId);
    if (subject) {
      const list = sectionSubjectsMap.get(a.sectionId) || [];
      if (!list.includes(subject.name)) {
        list.push(subject.name);
        sectionSubjectsMap.set(a.sectionId, list);
      }
    }
  });

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const activeDays = new Set([1, 2, 3, 4, 5]); // default Mon-Fri
  const targetDays = Array.from(activeDays).sort().map(d => dayNames[d]);

  const periodDefs = periods.map((p, idx) => ({
    index: idx,
    id: p.id,
    label: p.label,
    startTime: p.start_time,
    endTime: p.end_time,
    isBreak: p.is_break,
  }));

  const contextData = `
School Timetable Generation Request:

TARGET SECTION:
${classSectionId ? `- Only generate for section_id: ${classSectionId}` : "- All sections"}

SECTIONS TO SCHEDULE:
${sections
  .filter((s) => !classSectionId || s.id === classSectionId)
  .map((s) => {
    const offeredSubjects = sectionSubjectsMap.get(s.id) || [];
    return `- ${s.academic_classes?.name || ""} ${s.name} (Room: ${s.room || "TBD"}) [ID: ${s.id}]
  Offered Subjects: ${offeredSubjects.length > 0 ? offeredSubjects.join(", ") : "None assigned yet"}`;
  })
  .join("\n")}

ACTIVE DAYS OF THE WEEK:
${targetDays.join(", ")}

AVAILABLE PERIOD SLOTS PER DAY:
${periodDefs
  .map(
    (p) =>
      `- Index ${p.index}: ${p.label} (${p.startTime || "TBD"} - ${p.endTime || "TBD"})${
        p.isBreak ? " [BREAK - DO NOT SCHEDULE CLASSES HERE]" : ""
      }`
  )
  .join("\n")}

TEACHER AVAILABILITY & ASSIGNMENTS:
${mergedAssignments
  .map((a) => {
    const tName = teacherNameMap.get(a.teacherId) || a.teacherId;
    const subj = subjects.find((s) => s.id === a.subjectId);
    const sect = sections.find((s) => s.id === a.sectionId);
    return `- Teacher "${tName}" [ID: ${a.teacherId}] is assigned to teach "${subj?.name}" in section "${sect?.academic_classes?.name || ""} ${sect?.name || ""}" [Section ID: ${a.sectionId}]`;
  })
  .join("\n")}
`;

  console.log('--- CONTEXT DATA ---');
  console.log(contextData);
}

inspect();
