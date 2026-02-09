import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Palette } from "lucide-react";
import { toast } from "sonner";

interface BrandingSettingsDialogProps {
  schoolId: string;
  trigger?: React.ReactNode;
}

const PRESET_COLORS = [
  { name: "Blue", hue: 210, saturation: 100, lightness: 50 },
  { name: "Indigo", hue: 240, saturation: 70, lightness: 55 },
  { name: "Purple", hue: 270, saturation: 65, lightness: 55 },
  { name: "Pink", hue: 330, saturation: 80, lightness: 55 },
  { name: "Red", hue: 0, saturation: 75, lightness: 50 },
  { name: "Orange", hue: 25, saturation: 90, lightness: 50 },
  { name: "Amber", hue: 40, saturation: 95, lightness: 50 },
  { name: "Green", hue: 145, saturation: 65, lightness: 42 },
  { name: "Teal", hue: 175, saturation: 70, lightness: 42 },
  { name: "Cyan", hue: 195, saturation: 85, lightness: 45 },
];

export function BrandingSettingsDialog({ schoolId, trigger }: BrandingSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [hue, setHue] = useState(210);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("school_branding")
        .select("accent_hue,accent_saturation,accent_lightness")
        .eq("school_id", schoolId)
        .maybeSingle();
      if (data) {
        setHue(data.accent_hue ?? 210);
        setSaturation(data.accent_saturation ?? 100);
        setLightness(data.accent_lightness ?? 50);
      }
    })();
  }, [open, schoolId]);

  const previewColor = useMemo(
    () => `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    [hue, saturation, lightness]
  );

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("school_branding")
      .update({
        accent_hue: hue,
        accent_saturation: saturation,
        accent_lightness: lightness,
      })
      .eq("school_id", schoolId);

    if (error) {
      // If no row exists, try insert
      const { error: insertErr } = await supabase
        .from("school_branding")
        .insert({
          school_id: schoolId,
          accent_hue: hue,
          accent_saturation: saturation,
          accent_lightness: lightness,
        });
      if (insertErr) {
        toast.error(insertErr.message);
        setSaving(false);
        return;
      }
    }

    // Apply immediately
    const root = document.documentElement;
    root.style.setProperty("--brand", `${hue} ${saturation}% ${lightness}%`);

    // Clear the applied branding cache so it picks up new values
    toast.success("Brand color updated! Refresh to see full effect.");
    setSaving(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Palette className="mr-1 h-4 w-4" /> Brand Color
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Brand Color Settings</DialogTitle>
          <DialogDescription>
            Customize the primary color used across the school portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Live Preview */}
          <div className="flex items-center gap-4">
            <div
              className="h-16 w-16 rounded-xl shadow-md border"
              style={{ backgroundColor: previewColor }}
            />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Preview</p>
              <p className="text-xs text-muted-foreground">
                HSL({hue}, {saturation}%, {lightness}%)
              </p>
              <Button
                size="sm"
                className="mt-1"
                style={{ backgroundColor: previewColor, color: lightness > 60 ? "#000" : "#fff" }}
              >
                Sample Button
              </Button>
            </div>
          </div>

          {/* Preset Colors */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.name}
                  className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{
                    backgroundColor: `hsl(${preset.hue}, ${preset.saturation}%, ${preset.lightness}%)`,
                    borderColor:
                      hue === preset.hue && saturation === preset.saturation
                        ? "hsl(var(--foreground))"
                        : "transparent",
                  }}
                  title={preset.name}
                  onClick={() => {
                    setHue(preset.hue);
                    setSaturation(preset.saturation);
                    setLightness(preset.lightness);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Custom Sliders */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Hue ({hue}°)</Label>
              <div
                className="mt-2 h-3 rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))",
                }}
              />
              <Slider
                value={[hue]}
                onValueChange={([v]) => setHue(v)}
                min={0}
                max={360}
                step={1}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Saturation ({saturation}%)</Label>
              <Slider
                value={[saturation]}
                onValueChange={([v]) => setSaturation(v)}
                min={10}
                max={100}
                step={1}
              />
            </div>
            <div>
              <Label className="text-xs">Lightness ({lightness}%)</Label>
              <Slider
                value={[lightness]}
                onValueChange={([v]) => setLightness(v)}
                min={25}
                max={65}
                step={1}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Color"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
