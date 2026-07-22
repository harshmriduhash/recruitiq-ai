import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listTeam, inviteTeamMember, updateMemberRole, removeMember } from "@/lib/team.functions";
import { getMyOrg } from "@/lib/org.functions";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/team")({
  head: () => ({ meta: [{ title: "Team — RecruitIQ" }] }),
  component: TeamPage,
});

const ROLES = ["owner", "admin", "recruiter", "viewer"] as const;

function TeamPage() {
  const qc = useQueryClient();
  const teamFn = useServerFn(listTeam);
  const meFn = useServerFn(getMyOrg);
  const inviteFn = useServerFn(inviteTeamMember);
  const updateFn = useServerFn(updateMemberRole);
  const removeFn = useServerFn(removeMember);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("recruiter");
  const [inviting, setInviting] = useState(false);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const { data: members } = useQuery({ queryKey: ["team"], queryFn: () => teamFn() });
  const isAdmin = me?.roles?.some((r: string) => r === "owner" || r === "admin");

  async function invite() {
    setInviting(true);
    try {
      await inviteFn({ data: { email, role } });
      toast.success("Invite sent");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["team"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(userId: string, newRole: (typeof ROLES)[number]) {
    try {
      await updateFn({ data: { userId, role: newRole } });
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["team"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function remove(userId: string) {
    if (!confirm("Remove this member?")) return;
    try {
      await removeFn({ data: { userId } });
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["team"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <PageHeader title="Team" description="Manage teammates and their roles." />
      <div className="p-8 max-w-4xl space-y-6">
        {isAdmin && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Invite a teammate</h2>
            <div className="flex gap-2">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" type="email" />
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={invite} disabled={inviting || !email.includes("@")}>
                {inviting ? <Loader2 className="size-4 animate-spin" /> : <><UserPlus className="size-4 mr-1" /> Invite</>}
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Members</h2>
          <ul className="divide-y divide-border/60">
            {members?.map((m) => (
              <li key={m.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{m.full_name || m.email}</div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {m.roles.map((r) => <Badge key={r} className="text-[10px]">{r}</Badge>)}
                  {isAdmin && m.id !== me?.user.id && (
                    <>
                      <Select value={m.roles[0]} onValueChange={(v) => changeRole(m.id, v as any)}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.filter((r) => r !== "owner").map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="size-4" /></Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
