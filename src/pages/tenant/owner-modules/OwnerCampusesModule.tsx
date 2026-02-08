import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Plus, RefreshCw, LayoutGrid, BarChart3, Users, Trophy } from "lucide-react";
import { useCampuses, type Campus, type CampusFormData } from "@/hooks/useCampuses";
import { useCampusAnalytics } from "@/hooks/useCampusAnalytics";
import { CampusCard } from "@/components/campus/CampusCard";
import { CampusFormDialog } from "@/components/campus/CampusFormDialog";
import { CampusStaffManager } from "@/components/campus/CampusStaffManager";
import { CampusAnalyticsCards } from "@/components/campus/CampusAnalyticsCards";
import { CampusComparisonChart } from "@/components/campus/CampusComparisonChart";
import { CampusRankingTable } from "@/components/campus/CampusRankingTable";
import { AssignSectionsCampusDialog } from "@/components/campus/AssignSectionsCampusDialog";

interface Props {
  schoolId: string | null;
}

export function OwnerCampusesModule({ schoolId }: Props) {
  const {
    campuses,
    isLoading,
    staffAssignments,
    createCampus,
    updateCampus,
    deleteCampus,
    assignStaff,
    removeStaffAssignment,
    refetch,
  } = useCampuses(schoolId);

  const { data: analytics, isLoading: analyticsLoading } = useCampusAnalytics(schoolId, campuses);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null);
  const [sectionsDialogCampus, setSectionsDialogCampus] = useState<Campus | null>(null);
  const [tab, setTab] = useState("overview");

  const handleCreate = () => {
    setEditingCampus(null);
    setFormOpen(true);
  };

  const handleEdit = (campus: Campus) => {
    setEditingCampus(campus);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: CampusFormData & { id?: string }) => {
    if (data.id) {
      updateCampus.mutate(data as CampusFormData & { id: string }, {
        onSuccess: () => setFormOpen(false),
      });
    } else {
      createCampus.mutate(data, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this campus? This action cannot be undone.")) {
      deleteCampus.mutate(id);
      if (selectedCampus?.id === id) setSelectedCampus(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-muted-foreground">Loading campuses…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Multi-Campus Management</h1>
          <p className="text-muted-foreground">
            Manage campuses, assign staff & sections, compare performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Campus
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && analytics.length > 0 && <CampusAnalyticsCards analytics={analytics} />}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutGrid className="h-4 w-4" /> Campuses
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Comparison
          </TabsTrigger>
          <TabsTrigger value="ranking" className="gap-1.5">
            <Trophy className="h-4 w-4" /> Rankings
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5">
            <Users className="h-4 w-4" /> Staff
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab: Campus Cards */}
        <TabsContent value="overview" className="mt-4">
          {campuses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <h3 className="mt-4 font-display text-lg font-semibold">No Campuses Yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first campus to enable multi-campus management
                </p>
                <Button className="mt-4" onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" /> Add First Campus
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {campuses.map((campus) => (
                <CampusCard
                  key={campus.id}
                  campus={campus}
                  analytics={analytics?.find((a) => a.campusId === campus.id)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSelect={(c) => {
                    setSelectedCampus(c);
                    setSectionsDialogCampus(c);
                  }}
                  selected={selectedCampus?.id === campus.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-4">
          {analytics && analytics.length > 0 ? (
            <CampusComparisonChart analytics={analytics} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {campuses.length === 0
                  ? "Add campuses to see comparison analytics."
                  : analyticsLoading
                  ? "Loading analytics…"
                  : "No analytics data available yet. Assign sections and students to campuses."}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rankings Tab */}
        <TabsContent value="ranking" className="mt-4">
          {analytics && analytics.length > 0 ? (
            <CampusRankingTable analytics={analytics} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Add at least 2 campuses with data to see rankings.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff" className="mt-4">
          {campuses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Create campuses first to assign staff.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {campuses.map((campus) => (
                <CampusStaffManager
                  key={campus.id}
                  schoolId={schoolId!}
                  campus={campus}
                  assignments={staffAssignments}
                  onAssign={(campusId, userId, isPrimary) =>
                    assignStaff.mutate({ campusId, userId, isPrimary })
                  }
                  onRemove={(id) => removeStaffAssignment.mutate(id)}
                  isAssigning={assignStaff.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CampusFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        campus={editingCampus}
        onSubmit={handleFormSubmit}
        isPending={createCampus.isPending || updateCampus.isPending}
      />

      {sectionsDialogCampus && schoolId && (
        <AssignSectionsCampusDialog
          open={!!sectionsDialogCampus}
          onOpenChange={(o) => !o && setSectionsDialogCampus(null)}
          campus={sectionsDialogCampus}
          schoolId={schoolId}
        />
      )}
    </div>
  );
}
