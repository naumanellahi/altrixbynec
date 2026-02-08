import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  Heart,
  Lightbulb,
  Shield,
  Star,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

interface Props {
  schoolId: string;
}

export function SchoolReputationDashboard({ schoolId }: Props) {
  const { data: latestReport, isLoading } = useQuery({
    queryKey: ["ai_school_reputation", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_school_reputation")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const radarData = useMemo(() => {
    if (!latestReport) return [];
    return [
      { metric: "Reputation", value: latestReport.reputation_score || 0, fullMark: 100 },
      { metric: "Parent Trust", value: latestReport.parent_satisfaction_index || 0, fullMark: 100 },
      { metric: "Academic", value: latestReport.academic_score || 0, fullMark: 100 },
      { metric: "Community", value: latestReport.community_score || 0, fullMark: 100 },
      { metric: "Overall", value: latestReport.overall_score || 0, fullMark: 100 },
      { metric: "NPS", value: Math.max(0, ((latestReport.nps_score || 0) + 100) / 2), fullMark: 100 },
    ];
  }, [latestReport]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-500/10";
    if (score >= 60) return "text-amber-600 bg-amber-500/10";
    return "text-red-600 bg-red-500/10";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle2;
    if (score >= 60) return Activity;
    return AlertTriangle;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!latestReport) {
    return (
      <Card className="shadow-sm border-dashed">
        <CardContent className="py-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 font-display font-semibold">No Reputation Data Yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            AI will analyze your school's data and generate reputation insights as feedback and
            performance data accumulates.
          </p>
        </CardContent>
      </Card>
    );
  }

  const ScoreIcon = getScoreIcon(latestReport.reputation_score || 0);

  // Extract arrays from analysis_data JSON or use existing columns
  const analysisData = (latestReport.analysis_data || {}) as Record<string, unknown>;
  const strengths = (latestReport.strengths || []) as string[];
  const improvements = (latestReport.improvements || []) as string[];

  return (
    <div className="space-y-6">
      {/* Header with Score */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1"
        >
          <Card className="shadow-elevated overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 to-transparent p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">School Reputation Score</p>
                  <p className="mt-2 font-display text-5xl font-bold">
                    {latestReport.reputation_score || 0}
                    <span className="text-2xl text-muted-foreground">/100</span>
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className={getScoreColor(latestReport.reputation_score || 0)}>
                      <ScoreIcon className="mr-1 h-3 w-3" />
                      {(latestReport.reputation_score || 0) >= 80
                        ? "Excellent"
                        : (latestReport.reputation_score || 0) >= 60
                        ? "Good"
                        : "Needs Improvement"}
                    </Badge>
                    {latestReport.last_analyzed_at && (
                      <span className="text-xs text-muted-foreground">
                        as of {format(new Date(latestReport.last_analyzed_at), "MMMM yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`rounded-2xl p-4 ${getScoreColor(latestReport.reputation_score || 0)}`}>
                  <Shield className="h-8 w-8" />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 lg:w-72">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <Heart className="h-5 w-5 text-pink-500" />
              <p className="mt-2 text-2xl font-bold">
                {latestReport.parent_satisfaction_index || latestReport.parent_satisfaction || 0}%
              </p>
              <p className="text-xs text-muted-foreground">Parent Satisfaction</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <ThumbsUp className="h-5 w-5 text-blue-500" />
              <p className="mt-2 text-2xl font-bold">
                {latestReport.nps_score !== null ? (latestReport.nps_score > 0 ? "+" : "") + latestReport.nps_score : "—"}
              </p>
              <p className="text-xs text-muted-foreground">NPS Score</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <Users className="h-5 w-5 text-emerald-500" />
              <p className="mt-2 text-2xl font-bold">
                {latestReport.academic_score || 0}%
              </p>
              <p className="text-xs text-muted-foreground">Academic Score</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <Award className="h-5 w-5 text-amber-500" />
              <p className="mt-2 text-2xl font-bold">
                {latestReport.community_score || 0}%
              </p>
              <p className="text-xs text-muted-foreground">Community Score</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Radar Chart */}
      <Card className="shadow-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Performance Dimensions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Improvements */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 text-emerald-500" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strengths.length > 0 ? (
              <ul className="space-y-2">
                {strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {strength}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Analyzing strengths...</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {improvements.length > 0 ? (
              <ul className="space-y-2">
                {improvements.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No significant issues detected</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
