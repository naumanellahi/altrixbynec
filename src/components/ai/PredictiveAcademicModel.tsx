import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Brain,
  GraduationCap,
  Lightbulb,
  Target,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  studentId: string;
  schoolId: string;
}

export function PredictiveAcademicModel({ studentId, schoolId }: Props) {
  const { data: prediction, isLoading } = useQuery({
    queryKey: ["ai_academic_predictions", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_academic_predictions")
        .select("*")
        .eq("student_id", studentId)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!studentId && !!schoolId,
  });

  const { data: student } = useQuery({
    queryKey: ["student_name", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("first_name, last_name")
        .eq("id", studentId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  // Extract subject predictions from factors JSON if available
  const subjectData = useMemo(() => {
    if (!prediction?.factors) return [];
    const factors = prediction.factors as Record<string, unknown>;
    const subjects = factors?.subject_predictions as Record<string, { predicted: number; current: number }> | undefined;
    if (!subjects) return [];
    return Object.entries(subjects).map(([name, data]) => ({
      name: name.length > 8 ? name.slice(0, 8) + "…" : name,
      fullName: name,
      predicted: data.predicted || 0,
      current: data.current || 0,
      growth: (data.predicted || 0) - (data.current || 0),
    }));
  }, [prediction?.factors]);

  const getRiskColor = (risk: number) => {
    if (risk >= 60) return "text-red-600 bg-red-500/10";
    if (risk >= 30) return "text-amber-600 bg-amber-500/10";
    return "text-emerald-600 bg-emerald-500/10";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!prediction) {
    return (
      <Card className="shadow-sm border-dashed">
        <CardContent className="py-12 text-center">
          <Brain className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 font-display font-semibold">No Predictions Yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            AI will generate academic predictions as more assessment data becomes available.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Extract additional data from factors JSON
  const factors = (prediction.factors || {}) as Record<string, unknown>;
  const suggestedFocusAreas = (factors.suggested_focus_areas || []) as string[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 p-2.5">
          <Target className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Academic Predictions</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered forecast for {student?.first_name} {student?.last_name}
          </p>
        </div>
      </div>

      {/* Main Predictions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <GraduationCap className="h-5 w-5 text-primary" />
                <Badge className={getRiskColor(100 - (prediction.confidence || 0))}>
                  {prediction.confidence || 0}% confident
                </Badge>
              </div>
              <p className="mt-3 text-3xl font-bold">
                {prediction.predicted_grade || "—"}
              </p>
              <p className="text-xs text-muted-foreground">Predicted Grade</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="mt-3 text-3xl font-bold">
                {prediction.promotion_probability || 0}%
              </p>
              <p className="text-xs text-muted-foreground">Promotion Probability</p>
              <Progress value={prediction.promotion_probability || 0} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <AlertTriangle className={`h-5 w-5 ${
                  (prediction.failure_risk || 0) > 30 ? "text-red-500" : "text-emerald-500"
                }`} />
              </div>
              <p className="mt-3 text-3xl font-bold">
                {prediction.failure_risk || 0}%
              </p>
              <p className="text-xs text-muted-foreground">Failure Risk</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <p className="mt-3 text-3xl font-bold">
                {prediction.confidence || 0}%
              </p>
              <p className="text-xs text-muted-foreground">Confidence</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Focus Areas */}
      {suggestedFocusAreas.length > 0 && (
        <Card className="shadow-sm border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-primary" />
              Suggested Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {suggestedFocusAreas.map((area, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {area}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
