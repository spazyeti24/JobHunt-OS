import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import type { Settings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Save, RefreshCw } from "lucide-react";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/20">
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<Partial<Settings>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm(settings);
      setDirty(false);
    }
  }, [settings]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    updateSettings.mutate(
      { data: form },
      {
        onSuccess: () => {
          toast({ title: "Settings saved" });
          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
          setDirty(false);
        },
        onError: () => {
          toast({ title: "Save failed", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-8 py-6 border-b"><Skeleton className="h-8 w-32" /></div>
        <div className="flex-1 overflow-auto px-8 py-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b bg-background flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure job search and AI scoring parameters</p>
        </div>
        <Button onClick={handleSave} disabled={!dirty || updateSettings.isPending} className="gap-2">
          {updateSettings.isPending ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          Save Changes
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-5 max-w-3xl">

        <Section title="Search Queries" description="One job title per line. These are sent to JSearch and Adzuna.">
          <Field label="Search Queries" description="Enter one search query per line, e.g. 'Software Engineer' or 'Product Manager'">
            <Textarea
              value={form.searchQueries ?? ""}
              onChange={(e) => set("searchQueries", e.target.value)}
              className="font-mono text-sm min-h-28 resize-none"
              placeholder={"Software Engineer\nSenior Product Manager\nData Analyst"}
            />
          </Field>
        </Section>

        <Section title="Locations">
          <Field label="City / Region" description="One location per line for JSearch">
            <Textarea
              value={form.locations ?? ""}
              onChange={(e) => set("locations", e.target.value)}
              className="font-mono text-sm min-h-20 resize-none"
              placeholder={"Austin, TX\nRemote, US"}
            />
          </Field>
          <Field label="Location Radius (miles)" description="Used for proximity-based searches">
            <Input
              type="number"
              value={form.locationRadiusMiles ?? 25}
              onChange={(e) => set("locationRadiusMiles", Number(e.target.value))}
              className="w-32"
              min={5}
              max={100}
            />
          </Field>
        </Section>

        <Section title="Score Thresholds" description="Jobs that meet or beat these scores get a tailored resume + cover letter.">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Remote">
              <Input
                type="number"
                value={form.scoreThresholdRemote ?? 75}
                onChange={(e) => set("scoreThresholdRemote", Number(e.target.value))}
                min={0}
                max={100}
              />
            </Field>
            <Field label="Hybrid">
              <Input
                type="number"
                value={form.scoreThresholdHybrid ?? 82}
                onChange={(e) => set("scoreThresholdHybrid", Number(e.target.value))}
                min={0}
                max={100}
              />
            </Field>
            <Field label="On-site">
              <Input
                type="number"
                value={form.scoreThresholdOnsite ?? 90}
                onChange={(e) => set("scoreThresholdOnsite", Number(e.target.value))}
                min={0}
                max={100}
              />
            </Field>
          </div>
        </Section>

        <Section title="Work Location Filter" description="Which work arrangements to include in scoring.">
          <div className="space-y-3">
            {(["Remote", "Hybrid", "Onsite"] as const).map((type) => {
              const key = `include${type}` as keyof Settings;
              return (
                <div key={type} className="flex items-center justify-between">
                  <Label>{type}</Label>
                  <Switch
                    checked={Boolean(form[key])}
                    onCheckedChange={(v) => set(key, v as Settings[typeof key])}
                  />
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Employment Type Filter" description="Comma-separated types passed to job sources.">
          <Field label="Employment Types" description="e.g. FULLTIME,CONTRACTOR,PARTTIME">
            <Input
              value={form.employmentTypeFilter ?? ""}
              onChange={(e) => set("employmentTypeFilter", e.target.value)}
              placeholder="FULLTIME,CONTRACTOR"
            />
          </Field>
        </Section>

        <Section title="API Fetch Settings">
          <div className="grid grid-cols-2 gap-4">
            <Field label="JSearch Pages (1–5)">
              <Input
                type="number"
                value={form.jsearchPages ?? 2}
                onChange={(e) => set("jsearchPages", Number(e.target.value))}
                min={1}
                max={5}
              />
            </Field>
            <Field label="Adzuna Pages (1–5)">
              <Input
                type="number"
                value={form.adzunaPages ?? 2}
                onChange={(e) => set("adzunaPages", Number(e.target.value))}
                min={1}
                max={5}
              />
            </Field>
          </div>
          <Field label="JSearch Date Posted">
            <Select
              value={form.jsearchDatePosted ?? "week"}
              onValueChange={(v) => set("jsearchDatePosted", v as Settings["jsearchDatePosted"])}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="3days">Last 3 days</SelectItem>
                <SelectItem value="week">Last week</SelectItem>
                <SelectItem value="month">Last month</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section title="Scheduling">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable recurring runs</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically fetch + score jobs on a schedule</p>
            </div>
            <Switch
              checked={Boolean(form.recurringEnabled)}
              onCheckedChange={(v) => set("recurringEnabled", v)}
            />
          </div>
          {form.recurringEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Run time (HH:MM)">
                <Input
                  type="time"
                  value={form.scheduleTime ?? "08:00"}
                  onChange={(e) => set("scheduleTime", e.target.value)}
                />
              </Field>
              <Field label="Every N days">
                <Input
                  type="number"
                  value={form.scheduleFrequencyDays ?? 1}
                  onChange={(e) => set("scheduleFrequencyDays", Number(e.target.value))}
                  min={1}
                  max={30}
                />
              </Field>
            </div>
          )}
        </Section>

        <Section title="AI Context" description="Optional guidance fed directly into Claude's prompts.">
          <Field label="Candidate Context" description="Preferences or constraints Claude considers when scoring (e.g. 'I prefer startups', 'No travel roles')">
            <Textarea
              value={form.candidateContext ?? ""}
              onChange={(e) => set("candidateContext", e.target.value)}
              className="text-sm min-h-20 resize-none"
              placeholder="I prefer early-stage startups. No roles requiring >20% travel..."
            />
          </Field>
          <Field label="Cover Letter Style Guide" description="Instructions for tone, length, or format of generated cover letters">
            <Textarea
              value={form.coverLetterContext ?? ""}
              onChange={(e) => set("coverLetterContext", e.target.value)}
              className="text-sm min-h-20 resize-none"
              placeholder="Write in a confident but conversational tone. Keep it under 300 words..."
            />
          </Field>
        </Section>

      </div>
    </div>
  );
}
