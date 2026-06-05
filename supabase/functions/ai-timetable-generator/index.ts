import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const schoolId = body.schoolId ?? body.school_id;
    const constraints = body.constraints ?? body.Constraints ?? {};
    const classSectionId = body.classSectionId ?? body.class_section_id ?? null;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
        .select("user_id, profiles(display_name)")
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

    if (sectionsRes.error) throw sectionsRes.error;
    if (subjectsRes.error) throw subjectsRes.error;
    if (teachersRes.error) throw teachersRes.error;
    if (periodsRes.error) throw periodsRes.error;
    if (sectionSubjectsRes.error) throw sectionSubjectsRes.error;
    if (subjectAssignmentsRes.error) throw subjectAssignmentsRes.error;
    if (generalAssignmentsRes.error) throw generalAssignmentsRes.error;
    if (existingEntriesRes.error) throw existingEntriesRes.error;

    const sections = sectionsRes.data || [];
    const subjects = subjectsRes.data || [];
    const teachers = teachersRes.data || [];
    const periods = periodsRes.data || [];

    // Map teacher display name
    const teacherNameMap = new Map<string, string>();
    teachers.forEach((t: any) => {
      const name = t.profiles?.display_name || t.user_id;
      teacherNameMap.set(t.user_id, name);
    });

    // Merge subject assignments
    const mergedAssignments: Array<{ teacherId: string; sectionId: string; subjectId: string }> = [];
    const seenAssignments = new Set<string>();

    const addAssignment = (teacherId: string, sectionId: string, subjectId: string | null) => {
      if (!teacherId || !sectionId || !subjectId) return;
      const key = `${teacherId}:${sectionId}:${subjectId}`;
      if (seenAssignments.has(key)) return;
      seenAssignments.add(key);
      mergedAssignments.push({ teacherId, sectionId, subjectId });
    };

    (subjectAssignmentsRes.data || []).forEach((a: any) => {
      addAssignment(a.teacher_user_id, a.class_section_id, a.subject_id);
    });
    (generalAssignmentsRes.data || []).forEach((a: any) => {
      addAssignment(a.teacher_user_id, a.class_section_id, a.subject_id);
    });

    // Map which subjects are offered in each section
    const sectionSubjectsMap = new Map<string, string[]>();
    (sectionSubjectsRes.data || []).forEach((ss: any) => {
      const subject = subjects.find((s: any) => s.id === ss.subject_id);
      if (subject) {
        const list = sectionSubjectsMap.get(ss.class_section_id) || [];
        list.push(subject.name);
        sectionSubjectsMap.set(ss.class_section_id, list);
      }
    });

    // Busy slots mapping for clash prevention
    const busyTeachers = new Map<string, string[]>();
    const busyRooms = new Map<string, string[]>();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    if (classSectionId) {
      // Single section generation: avoid conflicts with ALL OTHER sections
      const otherEntries = (existingEntriesRes.data || []).filter(
        (e: any) => e.class_section_id !== classSectionId
      );

      otherEntries.forEach((e: any) => {
        const dayLabel = dayNames[e.day_of_week];
        if (!dayLabel) return;

        const pIndex = periods.findIndex((p: any) => p.id === e.period_id);
        if (pIndex < 0) return;

        const slotKey = `${dayLabel} period_index ${pIndex}`;

        if (e.teacher_user_id) {
          const list = busyTeachers.get(e.teacher_user_id) || [];
          list.push(slotKey);
          busyTeachers.set(e.teacher_user_id, list);
        }

        if (e.room) {
          const roomKey = String(e.room).toLowerCase().trim();
          const list = busyRooms.get(roomKey) || [];
          list.push(slotKey);
          busyRooms.set(roomKey, list);
        }
      });
    }

    const teacherBusyConstraints = [];
    for (const [teacherId, slots] of busyTeachers.entries()) {
      const name = teacherNameMap.get(teacherId) || teacherId;
      teacherBusyConstraints.push(`- Teacher "${name}" [ID: ${teacherId}] is BUSY at: ${slots.join(", ")}`);
    }

    const roomBusyConstraints = [];
    for (const [room, slots] of busyRooms.entries()) {
      roomBusyConstraints.push(`- Room "${room}" is BUSY at: ${slots.join(", ")}`);
    }

    // Active days detection
    const activeDays = new Set([1, 2, 3, 4, 5]); // default Mon-Fri
    (existingEntriesRes.data || []).forEach((e: any) => {
      if (e.day_of_week !== null && e.day_of_week !== undefined) {
        activeDays.add(e.day_of_week);
      }
    });
    const targetDays = Array.from(activeDays).sort().map(d => dayNames[d]);

    // Active period templates
    const periodDefs = periods.map((p: any, idx: number) => ({
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
  .filter((s: any) => !classSectionId || s.id === classSectionId)
  .map((s: any) => {
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
  .map((a: any) => {
    const tName = teacherNameMap.get(a.teacherId) || a.teacherId;
    const subj = subjects.find((s: any) => s.id === a.subjectId);
    const sect = sections.find((s: any) => s.id === a.sectionId);
    return `- Teacher "${tName}" [ID: ${a.teacherId}] is assigned to teach "${subj?.name}" in section "${sect?.academic_classes?.name || ""} ${sect?.name || ""}" [Section ID: ${a.sectionId}]`;
  })
  .join("\n")}

CLASH CONSTRAINTS (BUSY TEACHERS/ROOMS FROM OTHER SECTIONS):
${teacherBusyConstraints.length > 0 ? teacherBusyConstraints.join("\n") : "- No teacher busy constraints."}
${roomBusyConstraints.length > 0 ? roomBusyConstraints.join("\n") : "- No room busy constraints."}

USER-DEFINED CONSTRAINTS:
- Max classes per teacher per day: ${constraints?.maxClassesPerTeacher || 6}
- Max consecutive periods for a teacher: ${constraints?.maxConsecutivePeriods || "No Limit"}
- Respect break periods: ${constraints?.includeBreaks !== false}
- Subject frequency (periods/week): Target around ${constraints?.subjectPeriodsPerWeek || 5} periods per subject per section.
`;

    const systemPrompt = `You are a professional, expert school timetable generator. Your task is to produce a fully optimized, clash-free schedule in valid JSON format.

JSON schema:
{
  "timetable": [
    {
      "section_id": "uuid",
      "day": "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
      "period_index": integer,
      "subject_name": "string",
      "teacher_id": "uuid or null",
      "teacher_name": "string or null",
      "room": "string"
    }
  ],
  "conflicts_found": integer,
  "optimization_score": integer (0 to 100),
  "notes": ["string"]
}

STRICT RULE CHECKLIST:
1. Teacher Double-Booking (CRITICAL): A teacher must NEVER be scheduled in two different sections at the same day/period_index in your generated timetable. For example, if Teacher A is scheduled in Section X on Monday at Period 0, Teacher A CANNOT be scheduled in Section Y on Monday at Period 0.
2. Room Double-Booking (CRITICAL): A room must NEVER be scheduled for two different sections at the same day/period_index.
3. Teacher Busy Slots: Do not schedule a teacher at any slot listed as BUSY for them in the "CLASH CONSTRAINTS" list.
4. Room Busy Slots: Do not schedule any room at a slot listed as BUSY for it in the "CLASH CONSTRAINTS" list.
5. Break Slots: Do not schedule any class during a period index designated as [BREAK - DO NOT SCHEDULE]. Leave these slots empty (do not include them in the JSON timetable array).
6. Subject Limits: Only schedule subjects that are listed in "Offered Subjects" for that section.
7. Teacher Assignments: For each subject in a section, assign the exact teacher defined in the "TEACHER AVAILABILITY & ASSIGNMENTS" list. If a subject has no assigned teacher, set teacher_id: null and teacher_name: null (TBD).
8. Target Weekly Frequency: Schedule the target weekly frequency for each subject (usually ${constraints?.subjectPeriodsPerWeek || 5} periods per week per subject per section).
9. Even Distribution: Distribute the periods for a subject evenly across the days. Do not put multiple classes of the same subject on the same day unless target frequency exceeds active days.
10. Valid Slots: Only schedule on days listed in "ACTIVE DAYS OF THE WEEK" and period indexes defined in "AVAILABLE PERIOD SLOTS PER DAY" (from 0 to ${periodDefs.length - 1}).

Return ONLY the valid JSON block. Do not add markdown explanation, code blocks, or comments outside the JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contextData },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "{}";
    
    let timetableData;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      timetableData = JSON.parse(jsonStr.trim());
    } catch {
      timetableData = { error: "Failed to parse AI response", raw: content };
    }

    // Save the suggestion
    if (timetableData && !timetableData.error) {
      const timetable = timetableData.timetable || [];
      let calculatedConflicts = 0;

      // Group all entries (AI generated + existing other sections) by slot (day+period)
      const slotMap = new Map<string, Array<{ section_id: string, teacher_id: string | null, teacher_name: string | null, room: string | null }>>();

      // 1. Add AI generated ones
      for (const row of timetable) {
        const day = String(row.day || "").toLowerCase().trim();
        const periodIdx = Number(row.period_index);
        if (!day || !Number.isFinite(periodIdx)) continue;

        const key = `${day}:${periodIdx}`;
        const list = slotMap.get(key) || [];
        list.push({
          section_id: row.section_id,
          teacher_id: row.teacher_id || null,
          teacher_name: row.teacher_name || null,
          room: row.room || null
        });
        slotMap.set(key, list);
      }

      // 2. If single section, add other sections' existing entries from DB to check for double bookings
      if (classSectionId) {
        const otherEntries = (existingEntriesRes.data || []).filter(
          (e: any) => e.class_section_id !== classSectionId
        );
        otherEntries.forEach((e: any) => {
          const dayLabel = dayNames[e.day_of_week]?.toLowerCase();
          const pIndex = periods.findIndex((p: any) => p.id === e.period_id);
          if (!dayLabel || pIndex < 0) return;

          const key = `${dayLabel}:${pIndex}`;
          const list = slotMap.get(key) || [];
          const name = teacherNameMap.get(e.teacher_user_id || "") || null;
          list.push({
            section_id: e.class_section_id,
            teacher_id: e.teacher_user_id || null,
            teacher_name: name,
            room: e.room || null
          });
          slotMap.set(key, list);
        });
      }

      // 3. Scan for clashes
      for (const [_, items] of slotMap.entries()) {
        // Teacher double bookings
        const teacherAssigned = new Map<string, string[]>(); // teacher -> list of sections
        // Room double bookings
        const roomAssigned = new Map<string, string[]>(); // room -> list of sections

        for (const item of items) {
          const teacherKey = item.teacher_id ? String(item.teacher_id).toLowerCase() : item.teacher_name ? String(item.teacher_name).toLowerCase() : null;
          if (teacherKey && teacherKey !== "—" && teacherKey !== "tbd") {
            const list = teacherAssigned.get(teacherKey) || [];
            if (!list.includes(item.section_id)) {
              list.push(item.section_id);
              teacherAssigned.set(teacherKey, list);
            }
          }

          const roomKey = item.room ? String(item.room).trim().toLowerCase() : null;
          if (roomKey && roomKey !== "—" && roomKey !== "tbd" && roomKey !== "none") {
            const list = roomAssigned.get(roomKey) || [];
            if (!list.includes(item.section_id)) {
              list.push(item.section_id);
              roomAssigned.set(roomKey, list);
            }
          }
        }

        for (const [_, sectionsList] of teacherAssigned.entries()) {
          if (sectionsList.length > 1) {
            calculatedConflicts += (sectionsList.length - 1);
          }
        }

        for (const [_, sectionsList] of roomAssigned.entries()) {
          if (sectionsList.length > 1) {
            calculatedConflicts += (sectionsList.length - 1);
          }
        }
      }

      // Overwrite conflicts_found with true calculated conflicts
      timetableData.conflicts_found = calculatedConflicts;

      await supabase.from("ai_timetable_suggestions").insert({
        school_id: schoolId,
        class_section_id: classSectionId,
        suggestion_data: timetableData,
        conflicts_found: calculatedConflicts,
        optimization_score: timetableData.optimization_score || 0,
        status: "draft",
      });
    }

    return new Response(JSON.stringify({ success: true, timetableData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-timetable-generator error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
