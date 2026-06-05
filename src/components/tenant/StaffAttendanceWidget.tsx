import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MapPin,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  Compass,
  Wifi,
  Navigation,
  AlertTriangle,
  Lock
} from "lucide-react";

interface StaffAttendanceWidgetProps {
  schoolId: string;
}

interface SchoolLocation {
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
}

interface AttendanceRecord {
  id?: string;
  status: string;
  clock_in: string | null;
  clock_out: string | null;
  attendance_date: string;
}

// Calculate distance in meters using Haversine formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // returns distance in meters
}

const formatClockTime = (timeStr: string | null) => {
  if (!timeStr) return "";
  try {
    if (timeStr.includes("T") || timeStr.includes("-")) {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }
    }
    return timeStr.slice(0, 5);
  } catch {
    return timeStr.slice(0, 5);
  }
};

export function StaffAttendanceWidget({ schoolId }: StaffAttendanceWidgetProps) {
  const { user } = useSession();
  const [schoolLoc, setSchoolLoc] = useState<SchoolLocation | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User position states
  const [userCoords, setUserCoords] = useState<GeolocationCoordinates | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"disabled" | "weak" | "locked">("disabled");
  const [gpsError, setGpsError] = useState<string | null>(null);

  const todayDate = useMemo(() => new Date().toLocaleDateString("sv-SE"), []); // YYYY-MM-DD

  // Fetch school location & current attendance status
  const fetchData = async () => {
    try {
      // 1. Fetch location coordinates with fallback in case schema is not migrated yet
      try {
        const { data: schoolData, error: schoolErr } = await supabase
          .from("schools")
          .select("latitude,longitude,altitude")
          .eq("id", schoolId)
          .maybeSingle();

        if (schoolErr) {
          console.warn("Location columns missing in database schools table:", schoolErr.message);
          setSchoolLoc({ latitude: null, longitude: null, altitude: null });
        } else {
          setSchoolLoc(schoolData);
        }
      } catch (err) {
        console.warn("Failed to fetch coordinates, falling back:", err);
        setSchoolLoc({ latitude: null, longitude: null, altitude: null });
      }

      // 2. Fetch today's attendance for the logged-in staff
      if (user?.id) {
        const { data: attData, error: attErr } = await supabase
          .from("hr_staff_attendance")
          .select("id, status, clock_in, clock_out, attendance_date")
          .eq("school_id", schoolId)
          .eq("user_id", user.id)
          .eq("attendance_date", todayDate)
          .maybeSingle();

        if (attErr) throw attErr;
        setAttendance(attData);
      }
    } catch (e: any) {
      console.error("Error fetching attendance data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolId, user?.id, todayDate]);

  // Subscribe to live geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by this browser.");
      setGpsStatus("disabled");
      return;
    }

    let watchId: number | null = null;
    let fallbackWatchId: number | null = null;

    const handleSuccess = (position: GeolocationPosition) => {
      setUserCoords(position.coords);
      setGpsError(null);
      // If accuracy <= 35m, we trust the location; standard sensors (Wi-Fi, cell tower) will be around 15-40m
      if (position.coords.accuracy <= 35) {
        setGpsStatus("locked");
      } else {
        setGpsStatus("weak");
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn("GPS watch position error:", error.message);
      
      // If high accuracy failed or timed out, attempt standard accuracy fallback
      if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
        if (!fallbackWatchId) {
          console.warn("Retrying watchPosition with standard accuracy...");
          setGpsError("High accuracy GPS timed out. Calibrating with standard accuracy...");
          
          fallbackWatchId = navigator.geolocation.watchPosition(
            handleSuccess,
            (err) => {
              console.error("Fallback GPS error:", err);
              setGpsError(`GPS Error: ${err.message}`);
              setGpsStatus("disabled");
            },
            {
              enableHighAccuracy: false,
              timeout: 15000,
              maximumAge: 10000,
            }
          );
        }
      } else {
        setGpsError(error.message);
        setGpsStatus("disabled");
      }
    };

    // Start with high accuracy, timeout after 10 seconds to prompt fallback
    watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (fallbackWatchId !== null) navigator.geolocation.clearWatch(fallbackWatchId);
    };
  }, []);

  // Compute live distance
  const { distance, inRange, isLocationConfigured } = useMemo(() => {
    if (!schoolLoc || schoolLoc.latitude === null || schoolLoc.longitude === null) {
      return { distance: null, inRange: false, isLocationConfigured: false };
    }
    if (!userCoords) {
      return { distance: null, inRange: false, isLocationConfigured: true };
    }
    const dist = getDistance(
      schoolLoc.latitude,
      schoolLoc.longitude,
      userCoords.latitude,
      userCoords.longitude
    );
    return {
      distance: Math.round(dist),
      inRange: dist <= 100,
      isLocationConfigured: true,
    };
  }, [schoolLoc, userCoords]);

  // Attendance update operation
  const logAttendance = async (status: "present" | "absent" | "leave") => {
    if (!user?.id) return;
    
    // Safety check for location boundaries
    if (status !== "leave" && isLocationConfigured) {
      if (!userCoords) {
        toast.error("Location Error: Unable to verify your location. Please check your GPS signal or enable location permissions.");
        return;
      }
      if (!inRange) {
        toast.error(`Verification Failed: You are currently ${distance ? `${distance}m` : "unknown distance"} away from the campus (allowable limit: 100m).`);
        return;
      }
    }

    setSaving(true);
    
    try {
      const payload: any = {
        school_id: schoolId,
        user_id: user.id,
        attendance_date: todayDate,
        status,
        recorded_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (status === "present") {
        payload.clock_in = new Date().toISOString();
      }

      // Record check-in location details
      if (userCoords) {
        payload.latitude = userCoords.latitude;
        payload.longitude = userCoords.longitude;
        payload.altitude = userCoords.altitude;
      }

      const { error } = await supabase
        .from("hr_staff_attendance")
        .upsert(payload, { onConflict: "school_id,user_id,attendance_date" });

      if (error) throw error;

      toast.success(`Attendance successfully logged as ${status.toUpperCase()}!`);
      await fetchData();
    } catch (e: any) {
      console.error("Upsert attendance error:", e);
      toast.error(e.message || "Failed to sync attendance.");
    } finally {
      setSaving(false);
    }
  };

  // Clock Out operation
  const handleClockOut = async () => {
    if (!attendance?.id || !user?.id) return;
    
    if (isLocationConfigured) {
      if (!userCoords) {
        toast.error("Location Error: Unable to verify your location. Please enable location permissions to clock out.");
        return;
      }
      if (!inRange) {
        toast.error(`Verification Failed: You must be inside the 100m campus boundary to clock out (currently ${distance ? `${distance}m` : "unknown distance"} away).`);
        return;
      }
    }

    setSaving(true);
    
    try {
      const updates: any = {
        clock_out: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Record clock-out location details
      if (userCoords) {
        updates.latitude = userCoords.latitude;
        updates.longitude = userCoords.longitude;
        updates.altitude = userCoords.altitude;
      }

      const { error } = await supabase
        .from("hr_staff_attendance")
        .update(updates)
        .eq("id", attendance.id);

      if (error) throw error;

      toast.success("Clock-out successfully logged! Have a nice day.");
      await fetchData();
    } catch (e: any) {
      console.error("Clock out error:", e);
      toast.error(e.message || "Failed to log clock out.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border border-border/40 bg-card/60 backdrop-blur-md shadow-md animate-pulse">
        <CardContent className="py-6 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Initializing Geofencing Beacon...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border border-primary/10 bg-gradient-to-b from-card/90 to-card/50 backdrop-blur-xl shadow-xl rounded-3xl p-5 sm:p-6 transition-all duration-300 hover:shadow-2xl">
      {/* Dynamic Background Radar Glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between relative z-10">
        
        {/* Left Side: Connection & GPS Radar State */}
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted/40 border">
            {/* Live radar pulsing rings */}
            {isLocationConfigured && gpsStatus !== "disabled" && (
              <>
                <div className={`absolute inset-0 rounded-2xl animate-ping opacity-25 ${inRange ? "bg-emerald-500" : "bg-amber-500"}`} style={{ animationDuration: "1.8s" }} />
                <div className={`absolute inset-1 rounded-2xl animate-ping opacity-15 ${inRange ? "bg-emerald-500" : "bg-amber-500"}`} style={{ animationDuration: "2.8s", animationDelay: "0.4s" }} />
              </>
            )}
            <Compass className={`h-6 w-6 transition-colors duration-500 ${
              gpsStatus === "locked" ? (inRange ? "text-emerald-500" : "text-amber-500") : "text-muted-foreground animate-spin"
            }`} />
          </div>

          <div className="space-y-1">
            <h4 className="font-display text-sm sm:text-base font-semibold tracking-tight">
              Campus Beacon Presence
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {/* GPS Signal Strength Badge */}
              <Badge variant="outline" className={`text-[10px] font-medium h-5 rounded-lg border-none flex items-center gap-1 ${
                gpsStatus === "locked" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                gpsStatus === "weak" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                "bg-destructive/10 text-destructive dark:text-red-400"
              }`}>
                <Wifi className="h-3 w-3" />
                {gpsStatus === "locked" ? `High Accuracy (±${userCoords?.accuracy ? Math.round(userCoords.accuracy) : 5}m)` :
                 gpsStatus === "weak" ? "Weak Signal" : "No GPS Signal"}
              </Badge>

              {/* Geofence Status Badge */}
              {isLocationConfigured ? (
                <Badge variant="outline" className={`text-[10px] font-medium h-5 rounded-lg border-none flex items-center gap-1 ${
                  inRange ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}>
                  <Navigation className="h-3 w-3" />
                  {inRange ? "Within Range" : `${distance ? `${distance}m away` : "Out of bounds"}`}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-medium h-5 rounded-lg border-none bg-muted text-muted-foreground">
                  Perimeter Unconfigured
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Active Check-In status message */}
        <div className="flex flex-col items-start sm:items-end gap-1.5 min-w-0">
          <p className="text-xs text-muted-foreground font-mono">
            {new Date(todayDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
          {attendance ? (
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${
                attendance.status === "present" ? "bg-emerald-500 animate-pulse" :
                attendance.status === "leave" ? "bg-blue-500" : "bg-destructive"
              }`} />
              <p className="text-sm font-semibold capitalize font-display">
                Status: {attendance.status}
              </p>
              {attendance.clock_in && (
                <p className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded border border-border/40">
                  Clock-in: {formatClockTime(attendance.clock_in)}
                </p>
              )}
              {attendance.clock_out && (
                <p className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded border border-border/40">
                  Clock-out: {formatClockTime(attendance.clock_out)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Not marked today
            </p>
          )}
        </div>
      </div>

      {/* Warning if GPS fails or not configured */}
      {gpsError && (
        <p className="mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-2.5 flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4" />
          GPS Error: {gpsError}. Please allow location access to verify campus coordinates.
        </p>
      )}

      {/* Active User Geolocation coordinates preview */}
      {userCoords && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-mono bg-muted/20 px-3 py-2 rounded-xl border border-border/30">
          <span>Lat: {userCoords.latitude.toFixed(6)}</span>
          <span>Lng: {userCoords.longitude.toFixed(6)}</span>
          {userCoords.altitude !== null && (
            <span>Alt: {Math.round(userCoords.altitude)}m</span>
          )}
        </div>
      )}

      {!isLocationConfigured && (
        <p className="mt-4 text-xs text-muted-foreground bg-muted/40 border rounded-2xl p-4 flex items-start gap-2">
          <InfoIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <span>
            <strong>Campus Geofence coordinates not configured by Principal.</strong> Attendance check-ins will operate in offline/global mode. To configure settings, log in as the school principal.
          </span>
        </p>
      )}

      {/* Main Buttons Console */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {/* PRESENT BUTTON */}
        <Button
          type="button"
          onClick={() => logAttendance("present")}
          disabled={saving || (isLocationConfigured && !inRange) || (attendance && attendance.status === "present")}
          className={`h-12 gap-2 text-xs sm:text-sm font-semibold rounded-2xl transition-all shadow-sm ${
            attendance?.status === "present"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 cursor-default"
              : "bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-md hover:scale-[1.01] active:scale-95 disabled:opacity-50"
          }`}
        >
          {attendance?.status === "present" ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Present Checked
            </>
          ) : (
            <>
              {isLocationConfigured && !inRange && <Lock className="h-3.5 w-3.5" />}
              Mark Present
            </>
          )}
        </Button>

        {/* ABSENT BUTTON */}
        <Button
          type="button"
          onClick={() => logAttendance("absent")}
          disabled={saving || (isLocationConfigured && !inRange) || (attendance && attendance.status === "absent")}
          className={`h-12 gap-2 text-xs sm:text-sm font-semibold rounded-2xl transition-all shadow-sm ${
            attendance?.status === "absent"
              ? "bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/10 cursor-default"
              : "bg-destructive text-white hover:bg-red-500 hover:shadow-md hover:scale-[1.01] active:scale-95 disabled:opacity-50"
          }`}
        >
          {attendance?.status === "absent" ? (
            <>
              <XCircle className="h-4 w-4" />
              Absent Logged
            </>
          ) : (
            <>
              {isLocationConfigured && !inRange && <Lock className="h-3.5 w-3.5" />}
              Mark Absent
            </>
          )}
        </Button>

        {/* LEAVE BUTTON */}
        <Button
          type="button"
          onClick={() => logAttendance("leave")}
          disabled={saving || (attendance && attendance.status === "leave")}
          className={`h-12 gap-2 text-xs sm:text-sm font-semibold rounded-2xl transition-all shadow-sm ${
            attendance?.status === "leave"
              ? "bg-blue-500/10 border border-blue-500/30 text-blue-600 hover:bg-blue-500/10 cursor-default"
              : "bg-blue-600 text-white hover:bg-blue-500 hover:shadow-md hover:scale-[1.01] active:scale-95"
          }`}
        >
          {attendance?.status === "leave" ? (
            <>
              <FileText className="h-4 w-4" />
              On Leave
            </>
          ) : (
            <>
              Request Leave
            </>
          )}
        </Button>
      </div>

      {/* Clock Out Console for active Present staff */}
      {attendance && attendance.status === "present" && !attendance.clock_out && (
        <div className="mt-4 pt-4 border-t border-dashed border-border/80 flex justify-between items-center animate-fade-in">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-4 w-4 animate-pulse text-emerald-500" />
            <span>Duty active. Don't forget to clock out before leaving.</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClockOut}
            disabled={saving || (isLocationConfigured && !inRange)}
            className="rounded-xl text-xs font-semibold gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 active:scale-95"
          >
            {isLocationConfigured && !inRange && <Lock className="h-3 w-3" />}
            Clock Out
          </Button>
        </div>
      )}
    </Card>
  );
}

// Simple Helper Info SVG component to avoid warnings
function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
