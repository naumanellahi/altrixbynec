import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { useOfflineStaffMembers } from "@/hooks/useOfflineData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, RefreshCw, WifiOff, Check, X } from "lucide-react";
import { OfflineDataBanner } from "@/components/offline/OfflineDataBanner";
import { exportToCSV } from "@/lib/csv";

export function HrAttendanceModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: cachedStaff, isOffline, isUsingCache, refresh: refreshStaff } = useOfflineStaffMembers(schoolId);

  const { data: attendance = [], isLoading, refetch } = useQuery({
    queryKey: ["hr_staff_attendance", schoolId, selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_staff_attendance").select("*")
        .eq("school_id", schoolId!).eq("attendance_date", selectedDate);
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && !isOffline,
  });

  const { data: regs = [] } = useQuery({
    queryKey: ["hr_attendance_regs", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_attendance_regularizations").select("*").eq("school_id", schoolId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const markMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase.from("hr_staff_attendance").upsert({
        school_id: schoolId, user_id: userId, attendance_date: selectedDate, status,
        recorded_by: (await supabase.auth.getUser()).data.user?.id,
      }, { onConflict: "school_id,user_id,attendance_date" });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hr_staff_attendance"] }); toast.success("Attendance marked"); },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const reviewReg = useMutation({
    mutationFn: async ({ id, status, reg }: { id: string; status: "approved" | "rejected"; reg: any }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from("hr_attendance_regularizations").update({
        status, reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      if (status === "approved") {
        await supabase.from("hr_staff_attendance").upsert({
          school_id: schoolId, user_id: reg.employee_user_id, attendance_date: reg.attendance_date,
          status: reg.requested_status, recorded_by: user?.id,
        }, { onConflict: "school_id,user_id,attendance_date" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr_attendance_regs"] });
      queryClient.invalidateQueries({ queryKey: ["hr_staff_attendance"] });
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const attendanceByUserId = useMemo(() => {
    const map = new Map<string, any>();
    attendance.forEach((a: any) => map.set(a.user_id, a));
    return map;
  }, [attendance]);

  const handleExport = () => {
    const rows = cachedStaff.map((s) => {
      const att = attendanceByUserId.get(s.userId);
      return { Name: s.displayName || s.email, Email: s.email, Date: selectedDate, Status: att?.status || "Not Marked" };
    });
    exportToCSV(rows, `staff-attendance-${selectedDate}`);
    toast.success("Exported");
  };

  const pendingRegs = regs.filter((r: any) => r.status === "pending");

  if (isLoading && !isUsingCache) {
    return <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <OfflineDataBanner isOffline={isOffline} isUsingCache={isUsingCache} onRefresh={() => { refetch(); refreshStaff(); }} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold">Staff Attendance</h1>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="regularizations">Regularizations{pendingRegs.length > 0 && ` (${pendingRegs.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
            {!isOffline && <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>}
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export</Button>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">{new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</CardTitle></CardHeader>
            <CardContent>
              {cachedStaff.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{isOffline ? <div className="flex flex-col items-center gap-2"><WifiOff className="h-6 w-6" /><span>No cached staff</span></div> : "No staff."}</div>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Mark</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {cachedStaff.map((staff) => {
                      const att = attendanceByUserId.get(staff.userId);
                      return (
                        <TableRow key={staff.id}>
                          <TableCell className="font-medium">{staff.displayName || staff.email}</TableCell>
                          <TableCell className="text-muted-foreground">{staff.email}</TableCell>
                          <TableCell>{att ? <Badge variant={att.status === "present" ? "default" : att.status === "absent" ? "destructive" : "secondary"}>{att.status}</Badge> : <Badge variant="outline">—</Badge>}</TableCell>
                          <TableCell className="text-right">
                            {!isOffline && (
                              <Select value={att?.status || ""} onValueChange={(s) => markMutation.mutate({ userId: staff.userId, status: s })}>
                                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Mark" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="present">Present</SelectItem>
                                  <SelectItem value="absent">Absent</SelectItem>
                                  <SelectItem value="late">Late</SelectItem>
                                  <SelectItem value="half_day">Half Day</SelectItem>
                                  <SelectItem value="leave">On Leave</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regularizations" className="space-y-3 mt-4">
          {regs.length === 0 && <p className="text-sm text-muted-foreground">No regularization requests.</p>}
          {regs.map((r: any) => {
            const staff = cachedStaff.find((s) => s.userId === r.employee_user_id);
            return (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{staff?.displayName || staff?.email || r.employee_user_id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">{r.attendance_date} — wants <span className="font-medium capitalize">{r.requested_status}</span></p>
                    {r.reason && <p className="text-sm mt-1">{r.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === "pending" ? (
                      <>
                        <Button size="sm" onClick={() => reviewReg.mutate({ id: r.id, status: "approved", reg: r })}><Check className="h-4 w-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => reviewReg.mutate({ id: r.id, status: "rejected", reg: r })}><X className="h-4 w-4" /></Button>
                      </>
                    ) : (
                      <Badge variant={r.status === "approved" ? "default" : "outline"} className="capitalize">{r.status}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
