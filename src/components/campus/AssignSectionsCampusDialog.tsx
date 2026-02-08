import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { Campus } from "@/hooks/useCampuses";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campus: Campus;
  schoolId: string;
}

export function AssignSectionsCampusDialog({ open, onOpenChange, campus, schoolId }: Props) {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch all sections with class info
  const { data: sections } = useQuery({
    queryKey: ["all_sections_for_campus", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_sections")
        .select("id, name, class_id, campus_id, academic_classes(name)")
        .eq("school_id", schoolId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && open,
  });

  useEffect(() => {
    if (sections && open) {
      const assigned = new Set(
        sections
          .filter((s: any) => s.campus_id === campus.id)
          .map((s: any) => s.id)
      );
      setSelectedIds(assigned);
    }
  }, [sections, campus.id, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // For each section, update campus_id
      const updates = (sections || []).map((s: any) => {
        const shouldAssign = selectedIds.has(s.id);
        const newCampusId = shouldAssign ? campus.id : (s.campus_id === campus.id ? null : s.campus_id);
        return supabase
          .from("class_sections")
          .update({ campus_id: newCampusId } as any)
          .eq("id", s.id);
      });
      await Promise.all(updates);
    },
    onSuccess: () => {
      toast.success("Sections assigned to campus");
      qc.invalidateQueries({ queryKey: ["campus_analytics"] });
      qc.invalidateQueries({ queryKey: ["all_sections_for_campus"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Sections to {campus.name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-80">
          <div className="space-y-2 p-1">
            {(sections || []).map((s: any) => {
              const className = s.academic_classes?.name || "";
              const otherCampus = s.campus_id && s.campus_id !== campus.id;
              return (
                <label
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedIds.has(s.id)}
                    onCheckedChange={() => toggle(s.id)}
                    disabled={!!otherCampus}
                  />
                  <div>
                    <span className="text-sm font-medium">{className} – {s.name}</span>
                    {otherCampus && (
                      <span className="ml-2 text-xs text-muted-foreground">(assigned elsewhere)</span>
                    )}
                  </div>
                </label>
              );
            })}
            {(!sections || sections.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No sections found
              </p>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save Assignments"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
