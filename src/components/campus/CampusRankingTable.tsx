import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { CampusAnalytics } from "@/hooks/useCampusAnalytics";

interface Props {
  analytics: CampusAnalytics[];
}

export function CampusRankingTable({ analytics }: Props) {
  if (analytics.length === 0) return null;

  // Rank by composite score: attendance * 0.4 + marks * 0.4 + students * 0.2 (normalized)
  const maxStudents = Math.max(...analytics.map((a) => a.studentCount), 1);
  const ranked = analytics
    .map((a) => ({
      ...a,
      score: Math.round(
        a.attendanceRate * 0.4 + a.avgMarks * 0.4 + (a.studentCount / maxStudents) * 100 * 0.2
      ),
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-amber-500" />
          Campus Rankings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Campus</TableHead>
              <TableHead className="text-right">Students</TableHead>
              <TableHead className="text-right">Staff</TableHead>
              <TableHead className="text-right">Attendance</TableHead>
              <TableHead className="text-right">Avg Marks</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranked.map((r, idx) => (
              <TableRow key={r.campusId}>
                <TableCell>
                  {idx === 0 ? (
                    <Badge className="bg-amber-500 text-white text-[10px]">🥇</Badge>
                  ) : idx === 1 ? (
                    <Badge variant="secondary" className="text-[10px]">🥈</Badge>
                  ) : idx === 2 ? (
                    <Badge variant="outline" className="text-[10px]">🥉</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">{idx + 1}</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {r.campusName}
                  <span className="ml-1 text-xs text-muted-foreground">({r.campusCode})</span>
                </TableCell>
                <TableCell className="text-right">{r.studentCount}</TableCell>
                <TableCell className="text-right">{r.staffCount}</TableCell>
                <TableCell className="text-right">
                  <span className={r.attendanceRate >= 85 ? "text-emerald-600" : r.attendanceRate >= 70 ? "text-amber-600" : "text-destructive"}>
                    {r.attendanceRate}%
                  </span>
                </TableCell>
                <TableCell className="text-right">{r.avgMarks}</TableCell>
                <TableCell className="text-right font-display font-bold">{r.score}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
