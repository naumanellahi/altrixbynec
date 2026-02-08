import { Card, CardContent } from "@/components/ui/card";
import { Building2, GraduationCap, Users, TrendingUp, BarChart3, Coins } from "lucide-react";
import type { CampusAnalytics } from "@/hooks/useCampusAnalytics";

interface Props {
  analytics: CampusAnalytics[];
}

export function CampusAnalyticsCards({ analytics }: Props) {
  const totalStudents = analytics.reduce((s, a) => s + a.studentCount, 0);
  const totalStaff = analytics.reduce((s, a) => s + a.staffCount, 0);
  const avgAttendance =
    analytics.length > 0
      ? Math.round(analytics.reduce((s, a) => s + a.attendanceRate, 0) / analytics.length)
      : 0;
  const totalRevenue = analytics.reduce((s, a) => s + a.revenueThisMonth, 0);
  const avgMarks =
    analytics.length > 0
      ? Math.round(analytics.reduce((s, a) => s + a.avgMarks, 0) / analytics.length)
      : 0;

  const formatCurrency = (n: number) => {
    if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
    return `₹${n}`;
  };

  const cards = [
    { icon: Building2, label: "Total Campuses", value: analytics.length, color: "text-primary" },
    { icon: GraduationCap, label: "Total Students", value: totalStudents, color: "text-primary" },
    { icon: Users, label: "Cross-Campus Staff", value: totalStaff, color: "text-blue-600" },
    { icon: TrendingUp, label: "Avg Attendance", value: `${avgAttendance}%`, color: "text-emerald-600" },
    { icon: BarChart3, label: "Avg Marks", value: avgMarks, color: "text-purple-600" },
    { icon: Coins, label: "Revenue (MTD)", value: formatCurrency(totalRevenue), color: "text-amber-600" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <c.icon className={`h-5 w-5 ${c.color}`} />
            <p className="mt-2 font-display text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
