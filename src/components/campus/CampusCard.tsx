import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Edit, MapPin, Phone, Mail, Trash2, Users, GraduationCap } from "lucide-react";
import type { Campus } from "@/hooks/useCampuses";
import type { CampusAnalytics } from "@/hooks/useCampusAnalytics";

interface Props {
  campus: Campus;
  analytics?: CampusAnalytics;
  onEdit: (campus: Campus) => void;
  onDelete: (id: string) => void;
  onSelect: (campus: Campus) => void;
  selected: boolean;
}

export function CampusCard({ campus, analytics, onEdit, onDelete, onSelect, selected }: Props) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        selected ? "ring-2 ring-primary shadow-lg" : ""
      } ${!campus.is_active ? "opacity-60" : ""}`}
      onClick={() => onSelect(campus)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold">{campus.name}</h3>
              <p className="text-xs text-muted-foreground">{campus.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {campus.is_main && (
              <Badge variant="default" className="text-[10px]">Main</Badge>
            )}
            <Badge variant={campus.is_active ? "outline" : "secondary"} className="text-[10px]">
              {campus.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {campus.address && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{campus.address}{campus.city ? `, ${campus.city}` : ""}</span>
            </div>
          )}
          {campus.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{campus.phone}</span>
            </div>
          )}
          {campus.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{campus.email}</span>
            </div>
          )}
        </div>

        {/* Analytics summary */}
        {analytics && (
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <GraduationCap className="h-3 w-3 text-primary" />
                <span className="font-display text-sm font-bold">{analytics.studentCount}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Students</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-3 w-3 text-blue-600" />
                <span className="font-display text-sm font-bold">{analytics.staffCount}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Staff</p>
            </div>
            <div className="text-center">
              <span className="font-display text-sm font-bold">{analytics.attendanceRate}%</span>
              <p className="text-[10px] text-muted-foreground">Attendance</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(campus)}
          >
            <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
          {!campus.is_main && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(campus.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
