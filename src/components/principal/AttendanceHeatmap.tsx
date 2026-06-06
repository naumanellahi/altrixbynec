// src/components/principal/AttendanceHeatmap.tsx
import { useEffect, useRef, useState } from "react";
import subscribeAttendance from "@/lib/realtime/attendance";
import type { AttendanceRecord } from "@/integrations/supabase/types";

interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export function AttendanceHeatmap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);

  // Convert geographic coords (lat/lng) to canvas coords – placeholder linear mapping
  const latLngToCanvas = (lat: number, lng: number, width: number, height: number) => {
    // Assuming school bounds are roughly within [0, 1] for demo purposes
    const x = ((lng + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  };

  useEffect(() => {
    const unsub = subscribeAttendance((rec: AttendanceRecord) => {
      if (rec.latitude != null && rec.longitude != null) {
        const now = Date.now();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { x, y } = latLngToCanvas(rec.latitude, rec.longitude, canvas.width, canvas.height);
        setPoints((pts) => [...pts, { x, y, timestamp: now }]);
      }
    });
    return () => unsub();
  }, []);

  // Cleanup old points (fade out after 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 30_000;
      setPoints((pts) => pts.filter((p) => p.timestamp > cutoff));
    }, 5_000);
    return () => clearInterval(interval);
  }, []);

  // Render heatmap on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw each point with radial gradient
    points.forEach((p) => {
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 60);
      gradient.addColorStop(0, "rgba(255,0,0,0.4)");
      gradient.addColorStop(1, "rgba(255,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 60, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [points]);

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 via-accent/20 to-transparent shadow-elevated">
      <canvas ref={canvasRef} width={800} height={500} className="w-full h-full" />
    </div>
  );
}
