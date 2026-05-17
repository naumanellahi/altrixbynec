import { Radio, MapPin, Clock, CheckCircle2, XCircle, CircleDashed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLiveTeacherPresence } from "@/hooks/useLiveTeacherPresence";

interface Props {
  schoolId: string | null;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ago`;
}

function formatTime(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}

export function LiveTeacherPresenceCard({ schoolId }: Props) {
  const { liveTeachers, loading } = useLiveTeacherPresence(schoolId);

  return (
    <Card className="shadow-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            Live — Who's Teaching Now
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Radio className="h-3 w-3" />
            {liveTeachers.length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : liveTeachers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No periods are running right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {liveTeachers.map((t) => {
              const isIn = t.status === "in_class";
              const isLeft = t.status === "left";
              const isLate = t.status === "late";
              const accent = isIn
                ? "border-primary/40 bg-primary/5"
                : isLeft
                ? "border-destructive/40 bg-destructive/5"
                : "border-border bg-muted/30";
              return (
                <div
                  key={t.timetableEntryId}
                  className={`rounded-xl border p-3 transition-colors ${accent}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{t.teacherName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.subject}
                        {t.sectionLabel && ` • ${t.className ?? ""} ${t.sectionLabel}`}
                      </p>
                    </div>
                    {isIn && (
                      <Badge className="bg-primary text-primary-foreground gap-1 shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> In Class
                      </Badge>
                    )}
                    {isLeft && (
                      <Badge variant="destructive" className="gap-1 shrink-0">
                        <XCircle className="h-3 w-3" /> Left
                      </Badge>
                    )}
                    {isLate && (
                      <Badge variant="secondary" className="gap-1 shrink-0">
                        <Clock className="h-3 w-3" /> Late
                      </Badge>
                    )}
                    {t.status === "not_checked_in" && (
                      <Badge variant="outline" className="gap-1 shrink-0">
                        <CircleDashed className="h-3 w-3" /> Pending
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t.periodLabel} • {formatTime(t.startTime)}–{formatTime(t.endTime)}
                    </span>
                    {t.room && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {t.room}
                      </span>
                    )}
                    {t.updatedAt && (
                      <span className="ml-auto">Updated {timeAgo(t.updatedAt)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
