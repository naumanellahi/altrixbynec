import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  Download,
  Wand2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Save,
  X,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface Props {
  schoolId: string;
}

interface TimetableSuggestion {
  id: string;
  class_section_id: string | null;
  suggestion_data: Json;
  optimization_score: number | null;
  conflicts_found: number | null;
  status: string | null;
  version_number: number | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export function SmartTimetableGenerator({ schoolId }: Props) {
  const qc = useQueryClient();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showConstraints, setShowConstraints] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedGrid, setEditedGrid] = useState<Record<string, Record<string, { subject: string; teacher: string; room?: string }>> | null>(null);
  const [editingCell, setEditingCell] = useState<{ day: string; period: string } | null>(null);

  // Fetch class sections
  const { data: sections, isLoading: loadingSections } = useQuery({
    queryKey: ["class_sections_for_timetable", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_sections")
        .select(`
          id,
          name,
          room,
          class_id,
          academic_classes (
            name,
            grade_level
          )
        `)
        .eq("school_id", schoolId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  // Fetch AI suggestions
  const { data: suggestions, isLoading: loadingSuggestions } = useQuery({
    queryKey: ["ai_timetable_suggestions", schoolId, selectedSection],
    queryFn: async () => {
      let query = (supabase as any)
        .from("ai_timetable_suggestions")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (selectedSection) {
        query = query.eq("class_section_id", selectedSection);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TimetableSuggestion[];
    },
    enabled: !!schoolId,
  });

  // Fetch teachers for display
  const { data: teachers } = useQuery({
    queryKey: ["teachers_list", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles!inner (
            display_name
          )
        `)
        .eq("school_id", schoolId)
        .eq("role", "teacher");

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: ["subjects_list", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, code")
        .eq("school_id", schoolId);

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  // Generate timetable mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const constraints = {
        maxClassesPerTeacher: 6,
        includeBreaks: true,
      };

      const { data, error } = await supabase.functions.invoke("ai-timetable-generator", {
        body: {
          // Support both camelCase and snake_case on the backend (we send camelCase)
          schoolId,
          classSectionId: selectedSection || null,
          constraints,
        },
      });

      if (error) throw error;
      return data;
    },
    onMutate: () => {
      setGenerating(true);
    },
    onSuccess: () => {
      toast.success("Timetable generated successfully!");
      qc.invalidateQueries({ queryKey: ["ai_timetable_suggestions", schoolId] });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as any).message)
          : "Failed to generate timetable";
      toast.error(message);
    },
    onSettled: () => {
      setGenerating(false);
    },
  });

  // Approve timetable mutation
  const approveMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await (supabase as any)
        .from("ai_timetable_suggestions")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", suggestionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Timetable approved and applied!");
      qc.invalidateQueries({ queryKey: ["ai_timetable_suggestions", schoolId] });
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  const latestSuggestion = useMemo(() => suggestions?.[0], [suggestions]);

  const normalizeSuggestion = (data: Json): Record<string, Record<string, { subject: string; teacher: string; room?: string }>> => {
    const obj: any = data;
    if (obj && typeof obj === "object" && Array.isArray(obj.timetable)) {
      const grid: Record<string, Record<string, { subject: string; teacher: string; room?: string }>> = {};
      for (const row of obj.timetable) {
        const day = String(row.day ?? "").toLowerCase();
        const periodIndex = Number(row.period_index);
        if (!day || !Number.isFinite(periodIndex)) continue;
        const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
        const periodKey = `P${periodIndex + 1}`;
        grid[dayLabel] ??= {};
        grid[dayLabel][periodKey] = {
          subject: String(row.subject_name ?? "—"),
          teacher: String(row.teacher_name ?? row.teacher_id ?? "—"),
          room: row.room ? String(row.room) : undefined,
        };
      }
      return grid;
    }
    return (obj ?? {}) as Record<string, Record<string, { subject: string; teacher: string; room?: string }>>;
  };

  // Apply suggestion as real timetable_entries
  const applyMutation = useMutation({
    mutationFn: async (suggestion: TimetableSuggestion) => {
      if (!suggestion.class_section_id) throw new Error("Apply requires a specific section. Re-generate with a section selected.");
      const grid = editedGrid ?? normalizeSuggestion(suggestion.suggestion_data);

      // Fetch periods to map P1.. -> period_id
      const { data: periodsData, error: pErr } = await supabase
        .from("timetable_periods")
        .select("id,sort_order,start_time,end_time,is_break")
        .eq("school_id", schoolId)
        .order("sort_order");
      if (pErr) throw pErr;
      const periodByIndex = new Map<number, any>();
      (periodsData || []).forEach((p, i) => periodByIndex.set(i, p));

      const dayMap: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

      // Clear existing entries for this section
      const { error: delErr } = await supabase
        .from("timetable_entries")
        .delete()
        .eq("school_id", schoolId)
        .eq("class_section_id", suggestion.class_section_id);
      if (delErr) throw delErr;

      // Resolve teachers by display_name → user_id from directory
      const { data: dir } = await supabase
        .from("school_user_directory")
        .select("user_id,display_name,email")
        .eq("school_id", schoolId);
      const teacherIdByName = new Map<string, string>();
      (dir || []).forEach((d: any) => {
        if (d.display_name) teacherIdByName.set(String(d.display_name).toLowerCase(), d.user_id);
        if (d.email) teacherIdByName.set(String(d.email).toLowerCase(), d.user_id);
      });

      const inserts: any[] = [];
      for (const [dayLabel, periodsObj] of Object.entries(grid)) {
        const dayOfWeek = dayMap[dayLabel] ?? -1;
        if (dayOfWeek < 0) continue;
        for (const [periodKey, cell] of Object.entries(periodsObj)) {
          if (!cell?.subject || cell.subject === "—") continue;
          const idx = Number(periodKey.replace("P", "")) - 1;
          const period = periodByIndex.get(idx);
          if (!period || period.is_break) continue;
          const teacherUserId = cell.teacher && cell.teacher !== "—" ? teacherIdByName.get(cell.teacher.toLowerCase()) ?? null : null;
          inserts.push({
            school_id: schoolId,
            class_section_id: suggestion.class_section_id,
            day_of_week: dayOfWeek,
            period_id: period.id,
            subject_name: cell.subject,
            teacher_user_id: teacherUserId,
            start_time: period.start_time,
            end_time: period.end_time,
            room: cell.room ?? null,
          });
        }
      }
      if (inserts.length) {
        const { error: insErr } = await supabase.from("timetable_entries").insert(inserts);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      toast.success("AI timetable applied to the live schedule");
      setEditMode(false);
      setEditedGrid(null);
      qc.invalidateQueries({ queryKey: ["ai_timetable_suggestions", schoolId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to apply"),
  });

  const renderTimetableGrid = (data: Json) => {
    const baseGrid = normalizeSuggestion(data);
    const timetableData = editMode && editedGrid ? editedGrid : baseGrid;

    const updateCell = (day: string, period: string, field: "subject" | "teacher" | "room", value: string) => {
      setEditedGrid((prev) => {
        const next = { ...(prev ?? baseGrid) };
        next[day] = { ...(next[day] ?? {}) };
        next[day][period] = { ...(next[day][period] ?? { subject: "", teacher: "" }), [field]: value };
        return next;
      });
    };

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2 border bg-muted font-medium">Period</th>
              {DAYS.map((day) => (
                <th key={day} className="p-2 border bg-muted font-medium">
                  {day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period) => (
              <tr key={period}>
                <td className="p-2 border bg-muted/50 font-medium text-center">P{period}</td>
                {DAYS.map((day) => {
                  const periodKey = `P${period}`;
                  const cell = timetableData?.[day]?.[periodKey];
                  const isEditing = editMode && editingCell?.day === day && editingCell?.period === periodKey;

                  if (editMode && isEditing) {
                    return (
                      <td key={`${day}-${period}`} className="p-1 border align-top">
                        <div className="space-y-1">
                          <select
                            className="w-full rounded border bg-background px-1 py-0.5 text-[11px]"
                            value={cell?.subject ?? ""}
                            onChange={(e) => updateCell(day, periodKey, "subject", e.target.value)}
                          >
                            <option value="">—</option>
                            {(subjects ?? []).map((s) => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                          <select
                            className="w-full rounded border bg-background px-1 py-0.5 text-[10px]"
                            value={cell?.teacher ?? ""}
                            onChange={(e) => updateCell(day, periodKey, "teacher", e.target.value)}
                          >
                            <option value="">— teacher —</option>
                            {(teachers ?? []).map((t: any) => {
                              const name = t.profiles?.display_name ?? "";
                              return name ? <option key={t.user_id} value={name}>{name}</option> : null;
                            })}
                          </select>
                          <input
                            className="w-full rounded border bg-background px-1 py-0.5 text-[10px]"
                            placeholder="Room"
                            value={cell?.room ?? ""}
                            onChange={(e) => updateCell(day, periodKey, "room", e.target.value)}
                          />
                          <button
                            className="w-full rounded bg-primary px-1 py-0.5 text-[10px] text-primary-foreground"
                            onClick={() => setEditingCell(null)}
                          >
                            Done
                          </button>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={`${day}-${period}`}
                      className={`p-2 border text-center ${editMode ? "cursor-pointer hover:bg-muted/40" : ""}`}
                      onClick={() => editMode && setEditingCell({ day, period: periodKey })}
                    >
                      {cell ? (
                        <div>
                          <p className="font-medium text-primary">{cell.subject}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{cell.teacher}</p>
                          {cell.room && <p className="text-[9px] text-muted-foreground">{cell.room}</p>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{editMode ? "+ add" : "—"}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loadingSections) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-primary to-primary/60 p-2.5">
            <Wand2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Smart Timetable Generator</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered clash-free scheduling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedSection || "__all"} onValueChange={(v) => setSelectedSection(v === "__all" ? null : v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All Sections</SelectItem>
              {sections?.filter((s) => !!s.id).map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {(section.academic_classes as any)?.name} - {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generating}
            className="gap-2"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate
          </Button>
        </div>
      </div>

      {/* Constraints Panel */}
      <Collapsible open={showConstraints} onOpenChange={setShowConstraints}>
        <Card className="shadow-sm">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Lock className="h-4 w-4" />
                  Constraints & Rules
                </CardTitle>
                {showConstraints ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-surface-2 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Max Classes/Teacher</p>
                  <p className="mt-1 text-lg font-bold">6 per day</p>
                </div>
                <div className="rounded-xl bg-surface-2 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Break Periods</p>
                  <p className="mt-1 text-lg font-bold">P4 (Lunch)</p>
                </div>
                <div className="rounded-xl bg-surface-2 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Room Capacity</p>
                  <p className="mt-1 text-lg font-bold">Auto-managed</p>
                </div>
                <div className="rounded-xl bg-surface-2 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Subject Sequencing</p>
                  <p className="mt-1 text-lg font-bold">Optimized</p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Current/Latest Suggestion */}
      {generating && (
        <Card className="shadow-elevated border-primary/20">
          <CardContent className="py-12 text-center">
            <div className="relative mx-auto h-16 w-16">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Wand2 className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <p className="mt-4 font-medium">Generating optimal timetable...</p>
            <p className="mt-1 text-sm text-muted-foreground">
              AI is analyzing constraints and creating clash-free schedules
            </p>
            <Progress value={65} className="mt-4 mx-auto max-w-xs" />
          </CardContent>
        </Card>
      )}

      {!generating && latestSuggestion && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-elevated">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Generated Timetable v{latestSuggestion.version_number || 1}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Created {format(new Date(latestSuggestion.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={
                    latestSuggestion.status === "approved"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : latestSuggestion.status === "rejected"
                      ? "bg-red-500/10 text-red-600"
                      : "bg-amber-500/10 text-amber-600"
                  }>
                    {latestSuggestion.status || "pending"}
                  </Badge>
                  {latestSuggestion.optimization_score !== null && (
                    <Badge variant="outline">
                      Score: {latestSuggestion.optimization_score}%
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`rounded-xl p-3 text-center ${
                  (latestSuggestion.conflicts_found || 0) === 0
                    ? "bg-emerald-500/10"
                    : "bg-red-500/10"
                }`}>
                  {(latestSuggestion.conflicts_found || 0) === 0 ? (
                    <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="mx-auto h-5 w-5 text-red-600" />
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">Conflicts</p>
                  <p className="font-bold">{latestSuggestion.conflicts_found || 0}</p>
                </div>
                <div className="rounded-xl bg-surface-2 p-3 text-center">
                  <Clock className="mx-auto h-5 w-5 text-blue-600" />
                  <p className="mt-1 text-xs text-muted-foreground">Periods</p>
                  <p className="font-bold">{PERIODS.length * DAYS.length}</p>
                </div>
                <div className="rounded-xl bg-surface-2 p-3 text-center">
                  <Sparkles className="mx-auto h-5 w-5 text-primary" />
                  <p className="mt-1 text-xs text-muted-foreground">Optimization</p>
                  <p className="font-bold">{latestSuggestion.optimization_score || 0}%</p>
                </div>
              </div>

              {/* Timetable Grid */}
              {latestSuggestion.suggestion_data && (
                <div className="rounded-xl border p-4">
                  {renderTimetableGrid(latestSuggestion.suggestion_data)}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                {!editMode ? (
                  <Button variant="outline" onClick={() => setEditMode(true)} className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit Timetable
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => { setEditMode(false); setEditedGrid(null); setEditingCell(null); }} className="gap-2">
                      <X className="h-4 w-4" />
                      Cancel Edits
                    </Button>
                    <Button variant="secondary" onClick={() => toast.success("Edits kept locally — click Apply to save")} className="gap-2">
                      <Save className="h-4 w-4" />
                      Keep Edits
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => applyMutation.mutate(latestSuggestion)}
                  disabled={applyMutation.isPending || !latestSuggestion.class_section_id}
                  className="gap-2"
                  title={!latestSuggestion.class_section_id ? "Generate with a section selected to enable Apply" : "Save these entries to the live timetable"}
                >
                  {applyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Apply to Live Timetable
                </Button>
                {latestSuggestion.status !== "approved" && (
                  <Button
                    variant="outline"
                    onClick={() => approveMutation.mutate(latestSuggestion.id)}
                    disabled={approveMutation.isPending}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                )}
                <Button variant="ghost" className="gap-2" onClick={() => {
                  const blob = new Blob([JSON.stringify(latestSuggestion.suggestion_data, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = `timetable-v${latestSuggestion.version_number ?? 1}.json`; a.click();
                  URL.revokeObjectURL(url);
                }}>
                  <Download className="h-4 w-4" />
                  Export JSON
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => generateMutation.mutate()}
                  disabled={generating}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Version History */}
      {suggestions && suggestions.length > 1 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Version History</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {suggestions.slice(1).map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="flex items-center justify-between rounded-xl border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        Version {suggestion.version_number || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(suggestion.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {suggestion.optimization_score || 0}%
                      </Badge>
                      <Badge className={
                        suggestion.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-600 text-[10px]"
                          : "bg-muted text-muted-foreground text-[10px]"
                      }>
                        {suggestion.status || "draft"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!generating && !latestSuggestion && (
        <Card className="shadow-sm border-dashed">
          <CardContent className="py-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Wand2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mt-4 font-display font-semibold">No Timetables Generated Yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Click the "Generate" button to let AI create an optimized, clash-free timetable 
              based on your teachers, subjects, and constraints.
            </p>
            <Button
              onClick={() => generateMutation.mutate()}
              className="mt-6 gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Generate First Timetable
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
