import { cn } from "@/lib/utils";

export function passwordScore(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

const LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const COLORS = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-primary", "bg-emerald-500"];

export function PasswordStrength({ value }: { value: string }) {
  const score = value.length < 8 ? 0 : passwordScore(value);
  if (!value) return null;
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full bg-muted", i <= score && COLORS[score])} />
        ))}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">Strength: {LABELS[score]}</p>
    </div>
  );
}
