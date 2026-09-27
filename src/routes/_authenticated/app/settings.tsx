import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  cancelAccountDeletion,
  getAccount,
  requestAccountDeletion,
  updateProfile,
} from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — RecruitIQ" },
      { name: "description", content: "Manage your RecruitIQ profile, plan usage and account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchAccount = useServerFn(getAccount);
  const save = useServerFn(updateProfile);
  const del = useServerFn(requestAccountDeletion);
  const undo = useServerFn(cancelAccountDeletion);
  const { data, isLoading } = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });
  const [busy, setBusy] = useState(false);
  const [confirmPw, setConfirmPw] = useState("");

  if (isLoading || !data)
    return (
      <>
        <div className="p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      </>
    );

  const { profile, org } = data;
  const used = org?.candidates_used_this_period ?? 0;
  const quota = org?.monthly_candidate_quota ?? 0;
  const pct = quota ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  const deletionDate = profile.deleted_at
    ? new Date(new Date(profile.deleted_at).getTime() + 14 * 864e5).toLocaleDateString()
    : null;

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6 p-8">
        <h1 className="text-2xl font-bold">Settings</h1>

        <section className="surface-elevated space-y-4 p-6">
          <h2 className="font-semibold">Profile</h2>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const fullName = String(new FormData(e.currentTarget).get("fullName") ?? "");
              try {
                await save({ data: { fullName } });
                toast.success("Profile saved");
                qc.invalidateQueries({ queryKey: ["account"] });
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <div>
              <Label htmlFor="fullName">Name</Label>
              <Input id="fullName" name="fullName" defaultValue={profile.full_name ?? ""} maxLength={100} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={profile.email} disabled />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </section>

        <section className="surface-elevated space-y-3 p-6">
          <h2 className="font-semibold">Plan & usage</h2>
          <p className="text-sm text-muted-foreground">
            {org?.name} is on the <span className="font-medium capitalize text-foreground">{org?.plan}</span> plan.
          </p>
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Candidates scored this period</span>
              <span>{used} / {quota}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Paid plans (Starter $99 / Growth $299) are coming soon. Contact us to raise your limit.
          </p>
        </section>

        <section className="surface-elevated space-y-3 border-destructive/40 p-6">
          <h2 className="font-semibold text-destructive">Delete account</h2>
          {deletionDate ? (
            <>
              <p className="text-sm">Your account is scheduled for deletion on <b>{deletionDate}</b>.</p>
              <Button
                variant="outline"
                onClick={async () => {
                  await undo();
                  toast.success("Deletion cancelled");
                  qc.invalidateQueries({ queryKey: ["account"] });
                }}
              >
                Keep my account
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Your account is deactivated immediately and permanently removed after 14 days. Sign back in
                before then to restore it. Audit records are kept in anonymised form.
              </p>
              <Label htmlFor="confirmPw">Confirm your password</Label>
              <Input id="confirmPw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
              <Button
                variant="destructive"
                disabled={busy || !confirmPw}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const { error } = await supabase.auth.signInWithPassword({ email: profile.email, password: confirmPw });
                    if (error) throw new Error("Password is incorrect");
                    await del();
                    await supabase.auth.signOut();
                    toast.success("Account scheduled for deletion");
                    navigate({ to: "/" });
                  } catch (err) {
                    toast.error((err as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Delete my account
              </Button>
            </>
          )}
        </section>
      </div>
    </>
  );
}
