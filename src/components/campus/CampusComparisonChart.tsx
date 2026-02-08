import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { BarChart3, Target } from "lucide-react";
import type { CampusAnalytics } from "@/hooks/useCampusAnalytics";

interface Props {
  analytics: CampusAnalytics[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function CampusComparisonChart({ analytics }: Props) {
  if (analytics.length === 0) return null;

  const barData = analytics.map((a) => ({
    name: a.campusCode,
    students: a.studentCount,
    staff: a.staffCount,
    sections: a.sectionCount,
  }));

  const radarData = [
    { metric: "Students", ...Object.fromEntries(analytics.map((a) => [a.campusCode, a.studentCount])) },
    { metric: "Attendance %", ...Object.fromEntries(analytics.map((a) => [a.campusCode, a.attendanceRate])) },
    { metric: "Avg Marks", ...Object.fromEntries(analytics.map((a) => [a.campusCode, a.avgMarks])) },
    { metric: "Staff", ...Object.fromEntries(analytics.map((a) => [a.campusCode, a.staffCount])) },
    { metric: "Sections", ...Object.fromEntries(analytics.map((a) => [a.campusCode, a.sectionCount])) },
  ];

  const bestPerformer = analytics.reduce((best, curr) =>
    curr.attendanceRate + curr.avgMarks > best.attendanceRate + best.avgMarks ? curr : best
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Bar Chart: Resources */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Resource Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--background))",
                  }}
                />
                <Bar dataKey="students" fill={COLORS[0]} radius={[4, 4, 0, 0]} name="Students" />
                <Bar dataKey="staff" fill={COLORS[1]} radius={[4, 4, 0, 0]} name="Staff" />
                <Bar dataKey="sections" fill={COLORS[2]} radius={[4, 4, 0, 0]} name="Sections" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart: Performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            Performance Comparison
            <Badge variant="outline" className="ml-auto text-[10px]">
              Best: {bestPerformer.campusName}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                {analytics.map((a, i) => (
                  <Radar
                    key={a.campusId}
                    name={a.campusCode}
                    dataKey={a.campusCode}
                    stroke={COLORS[i % COLORS.length]}
                    fill={COLORS[i % COLORS.length]}
                    fillOpacity={0.15}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
