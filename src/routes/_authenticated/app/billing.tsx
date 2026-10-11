import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cancelSubscription, getBilling, mockCheckout, resumeSubscription } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/app/billing")({
  head: () => ({
    meta: [
      { title: "Billing & plan — RecruitIQ" },
      { name: "description", content: "Upgrade, change or cancel your RecruitIQ plan." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
});

const PLANS = [
  { id: "free", name: "Free", price: 0, features: ["1 open job", "20 candidates / month", "1 seat"] },
  { id: "starter", name: "Starter", price: 99, features: ["5 open jobs", "200 candidates / month", "3 seats", "Audit log"] },
  { id: "growth", name: "Growth", price: 299, features: ["Unlimited jobs", "1,000 candidates / month", "ATS integrations", "Voice pre-screen"] },
] as const;

const REASONS = ["Too expensive", "Not hiring right now", "Missing a feature I need", "Scores weren't accurate enough", "Switching to another tool", "Other"];

function BillingPage() {
  const qc = useQueryClient();
  const fetchBilling = useServerFn(getBilling);
  const resume = useServerFn(resumeSubscription);
  const { data, isLoading } = useQuery({ queryKey: ["billing"], queryFn: () => fetchBilling() });
  const [checkoutPlan, setCheckoutPlan] = useState<"starter" | "growth" | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["billing"] });
    qc.invalidateQueries({ queryKey: ["account"] });
  };

  if (isLoading || !data?.org) return <div className="p-8"><Loader2 className="size-5 animate-spin" /></div>;
  const { org, events, canManage } = data;
  const periodEnd = org.current_period_end ? new Date(org.current_period_end).toLocaleDateString() : null;

  return (
    <>
      <PageHeader title="Billing" description="Manage your plan. Payments are in test mode — no real charges are made." />
      <div className="p-8 space-y-8 max-w-5xl">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <b>Test mode:</b> checkout is simulated. Use any card number ending in <code>4242</code>; ending in <code>0002</code> simulates a decline.
        </div>

        <Card className="p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Current plan</div>
            <div className="text-2xl font-bold capitalize">{org.plan}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {org.candidates_used_this_period} / {org.monthly_candidate_quota} candidates this period
              {periodEnd && (org.cancel_at_period_end ? ` · ends ${periodEnd}, then moves to Free` : ` · renews ${periodEnd}`)}
            </div>
          </div>
          {canManage && org.plan !== "free" && (
            org.cancel_at_period_end ? (
              <Button variant="outline" onClick={async () => {
                const r = await resume();
                r.ok ? toast.success("Subscription resumed") : toast.error(r.error);
                refresh();
              }}>Keep my plan</Button>
            ) : (
              <Button variant="outline" className="text-destructive" onClick={() => setCancelOpen(true)}>Cancel plan</Button>
            )
          )}
        </Card>

        {!canManage && <p className="text-sm text-muted-foreground">Only owners and admins can change the plan.</p>}

        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((p) => {
            const current = org.plan === p.id;
            return (
              <Card key={p.id} className={`p-6 space-y-4 ${current ? "border-primary" : ""}`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{p.name}</h2>
                  {current && <Badge>Current</Badge>}
                </div>
                <div className="text-3xl font-bold">${p.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <ul className="space-y-1 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="size-4 text-primary shrink-0" />{f}</li>)}
                </ul>
                {p.id !== "free" && !current && canManage && (
                  <Button className="w-full" onClick={() => setCheckoutPlan(p.id)}>
                    {org.plan === "free" ? "Upgrade" : "Switch"} to {p.name}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Billing history</h2>
          <Card className="divide-y divide-border/60">
            {events.length === 0 && <div className="p-4 text-sm text-muted-foreground">No billing activity yet.</div>}
            {events.map((e: any) => (
              <div key={e.id} className="flex justify-between gap-4 p-3 text-sm">
                <span className="capitalize">{e.event_type.replace(/_/g, " ")}{e.to_plan ? ` → ${e.to_plan}` : ""}</span>
                <span className="text-muted-foreground">
                  {e.amount_cents ? `$${(e.amount_cents / 100).toFixed(2)} (test) · ` : ""}{new Date(e.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </Card>
        </section>
      </div>

      <CheckoutDialog plan={checkoutPlan} onClose={() => setCheckoutPlan(null)} onDone={refresh} />
      <CancelDialog open={cancelOpen} onClose={() => setCancelOpen(false)} onDone={refresh} plan={org.plan} periodEnd={periodEnd} />
    </>
  );
}

function CheckoutDialog({ plan, onClose, onDone }: { plan: "starter" | "growth" | null; onClose: () => void; onDone: () => void }) {
  const checkout = useServerFn(mockCheckout);
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [busy, setBusy] = useState(false);
  const digits = card.replace(/\D/g, "");
  const meta = PLANS.find((p) => p.id === plan);
  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CreditCard className="size-4" /> Test checkout — {meta?.name}</DialogTitle>
          <DialogDescription>${meta?.price}/month. This is a simulated payment; no card is charged.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="card">Card number</Label><Input id="card" value={card} onChange={(e) => setCard(e.target.value)} inputMode="numeric" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="exp">Expiry</Label><Input id="exp" defaultValue="12/30" /></div>
            <div><Label htmlFor="cvc">CVC</Label><Input id="cvc" defaultValue="123" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={busy || digits.length < 12 || !plan} onClick={async () => {
            setBusy(true);
            const r = await checkout({ data: { plan: plan!, cardLast4: digits.slice(-4) } });
            setBusy(false);
            if (r.ok) { toast.success(`You're now on ${meta?.name}`); onDone(); onClose(); }
            else toast.error(r.error);
          }}>
            {busy && <Loader2 className="size-4 animate-spin mr-2" />} Pay ${meta?.price}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({ open, onClose, onDone, plan, periodEnd }: { open: boolean; onClose: () => void; onDone: () => void; plan: string; periodEnd: string | null }) {
  const cancel = useServerFn(cancelSubscription);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (immediate: boolean) => {
    setBusy(true);
    const r = await cancel({ data: { reason, feedback: feedback || undefined, immediate } });
    setBusy(false);
    if (r.ok) {
      toast.success(immediate ? "Moved to the Free plan" : `Plan cancelled — you keep ${plan} until ${periodEnd ?? "the end of the period"}`);
      onDone(); onClose(); setReason(""); setFeedback("");
    } else toast.error(r.error);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Before you go — why are you cancelling?</DialogTitle>
          <DialogDescription>
            Your jobs, candidates and match reports stay available. On Free you can keep 1 open job and score 20 candidates a month.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} /> {r}
            </label>
          ))}
          <Textarea placeholder="Anything we could do better? (optional)" value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={2000} />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onClose}>Keep my plan</Button>
          <Button variant="outline" disabled={!reason || busy} onClick={() => submit(true)}>Cancel now</Button>
          <Button variant="destructive" disabled={!reason || busy} onClick={() => submit(false)}>
            {busy && <Loader2 className="size-4 animate-spin mr-2" />} Cancel at period end
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
