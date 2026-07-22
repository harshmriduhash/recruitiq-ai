import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { hybridCandidateSearch } from "@/lib/search.functions";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/candidates")({
  head: () => ({ meta: [{ title: "Candidates — RecruitIQ" }] }),
  component: CandidatesPage,
});

function CandidatesPage() {
  const [q, setQ] = useState("");
  const fn = useServerFn(hybridCandidateSearch);
  const { data, isFetching } = useQuery({
    queryKey: ["cand-search", q],
    queryFn: () => fn({ data: { query: q } }),
  });

  return (
    <>
      <PageHeader title="Candidates" description="Hybrid search across every resume in your org." />
      <div className="p-8 max-w-4xl space-y-4">
        <Card className="p-4">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by skill, name, or resume text — e.g. 'kubernetes fintech'"
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {data?.mode === "hybrid" ? "Full-text + semantic re-rank" : "Showing most recent candidates"}
            {isFetching && " · Searching…"}
          </p>
        </Card>

        <Card className="p-6">
          {!data?.results?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No candidates yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.results.map((r: any) => (
                <li key={r.id}>
                  <Link to="/app/candidates/$id" params={{ id: r.id }} className="py-3 flex items-center justify-between hover:bg-white/5 rounded px-2 -mx-2">
                    <div>
                      <div className="text-sm font-medium">{r.candidate_name || "Anonymous candidate"}</div>
                      <div className="text-xs text-muted-foreground">{r.candidate_email ?? "no email"} · {r.job_requisitions?.title ?? "—"}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
