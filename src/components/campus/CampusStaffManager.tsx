import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, X, Star } from "lucide-react";
import type { Campus, StaffCampusAssignment } from "@/hooks/useCampuses";

interface Props {
  schoolId: string;
  campus: Campus;
  assignments: StaffCampusAssignment[];
  onAssign: (campusId: string, userId: string, isPrimary: boolean) => void;
  onRemove: (assignmentId: string) => void;
  isAssigning: boolean;
}

export function CampusStaffManager({ schoolId, campus, assignments, onAssign, onRemove, isAssigning }: Props) {
  const [selectedUserId, setSelectedUserId] = useState("");

  // Fetch all staff in the school
  const { data: allStaff } = useQuery({
    queryKey: ["school_staff_directory", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_user_directory")
        .select("user_id, display_name, email")
        .eq("school_id", schoolId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const campusAssignments = useMemo(
    () => assignments.filter((a) => a.campus_id === campus.id),
    [assignments, campus.id]
  );

  const assignedUserIds = new Set(campusAssignments.map((a) => a.user_id));
  const availableStaff = (allStaff || []).filter((s) => !assignedUserIds.has(s.user_id));

  const getStaffName = (userId: string) => {
    const staff = allStaff?.find((s) => s.user_id === userId);
    return staff?.display_name || staff?.email || userId.slice(0, 8);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Staff at {campus.name}
          <Badge variant="secondary" className="ml-auto">{campusAssignments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add staff */}
        <div className="flex gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select staff to assign" />
            </SelectTrigger>
            <SelectContent>
              {availableStaff.map((s) => (
                <SelectItem key={s.user_id} value={s.user_id}>
                  {s.display_name || s.email}
                </SelectItem>
              ))}
              {availableStaff.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">All staff assigned</div>
              )}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!selectedUserId || isAssigning}
            onClick={() => {
              onAssign(campus.id, selectedUserId, false);
              setSelectedUserId("");
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Assignment list */}
        <div className="divide-y rounded-lg border">
          {campusAssignments.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground text-center">No staff assigned yet</p>
          )}
          {campusAssignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{getStaffName(assignment.user_id)}</span>
                {assignment.is_primary && (
                  <Badge variant="default" className="text-[10px] gap-1">
                    <Star className="h-3 w-3" /> Primary
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(assignment.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
