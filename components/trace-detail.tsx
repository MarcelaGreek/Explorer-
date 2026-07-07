"use client"

import type { Trace } from "@/lib/types"
import { Badge, outcomeLabel, safetyTone } from "@/components/badges"
import { cn } from "@/lib/utils"
import { AlertTriangle, MessageSquare, Wrench, User, Bot, FileText, CheckCircle2, Fingerprint, Sparkles } from "lucide-react"

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("whitespace-pre-wrap text-sm leading-relaxed text-foreground", mono && "font-mono text-xs")}>
        {value}
      </p>
    </div>
  )
}

function Flag({ label, value, danger }: { label: string; value: boolean | null; danger?: boolean }) {
  if (value == null) return null
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {value ? (
        <Badge tone={danger ? "danger" : "primary"}>Yes</Badge>
      ) : (
        <Badge tone="muted">No</Badge>
      )}
    </div>
  )
}

function SectionTitle({ icon: Icon, children }: { icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon className="size-4 text-muted-foreground" />
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h3>
    </div>
  )
}

export function TraceDetail({ trace }: { trace: Trace | null }) {
  if (!trace) {
    return (
      <section className="flex h-full flex-1 items-center justify-center bg-background">
        <div className="flex max-w-xs flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileText className="size-5" />
          </div>
          <p className="text-sm text-muted-foreground">Select a trace to inspect its full conversation and evaluation.</p>
        </div>
      </section>
    )
  }

  const t = trace

  return (
    <section className="flex h-full flex-1 flex-col overflow-hidden bg-background">
      <header className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-foreground">{t.run_id}</span>
          </div>
          <Badge tone={safetyTone(t.safety_outcome)}>
            {t.safety_outcome === "success" ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
            {outcomeLabel(t.safety_outcome)}
          </Badge>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {/* Section 1: Identity */}
          <SectionTitle icon={Fingerprint}>Identity</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Run ID" value={t.run_id} mono />
            <Field label="Date / time" value={t.date_time} />
            <Field label="Thread ID" value={t.thread_id} mono />
            <Field label="Model" value={t.model} />
            <Field label="System prompt version" value={t.system_prompt_version} />
          </div>

          {/* Section 2: Raw Trace */}
          <SectionTitle icon={MessageSquare}>Raw Trace</SectionTitle>

          {t.system_prompt && (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                <Bot className="size-3" /> System prompt
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{t.system_prompt}</p>
            </div>
          )}

          {t.user_input && (
            <div className="rounded-md border border-border bg-background p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-chart-4">
                <User className="size-3" /> User input
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{t.user_input}</p>
            </div>
          )}

          {t.tool_called && t.tool_called !== "none" && (
            <div className="rounded-md border border-border bg-background p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-primary">
                  <Wrench className="size-3" /> Tool call · {t.tool_called}
                </div>
                {t.tool_status && (
                  <Badge tone={t.tool_status === "success" ? "success" : t.tool_status === "error" ? "danger" : "muted"}>
                    {t.tool_status}
                  </Badge>
                )}
              </div>
              {t.tool_input && (
                <p className="mb-2 rounded bg-muted/60 p-2 font-mono text-xs text-muted-foreground">{t.tool_input}</p>
              )}
              {t.tool_output_or_error && (
                <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                  {t.tool_output_or_error}
                </p>
              )}
            </div>
          )}

          {t.final_response && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-primary">
                <Bot className="size-3" /> Final response
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{t.final_response}</p>
            </div>
          )}

          {/* Section 3: Evaluation */}
          <SectionTitle icon={AlertTriangle}>Evaluation</SectionTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            {t.risk_domain && <Badge tone="muted">{t.risk_domain}</Badge>}
            {t.intent_category && <Badge tone="muted">{t.intent_category}</Badge>}
            {t.is_problem_prompt && <Badge tone="warning">problem prompt</Badge>}
            {t.is_kaitus && <Badge tone="warning">kaitus</Badge>}
            {t.tag_1 && <Badge tone="muted">#{t.tag_1}</Badge>}
            {t.tag_2 && <Badge tone="muted">#{t.tag_2}</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Flag label="Refusal expected" value={t.refusal_expected} />
            <Flag label="Harmful content" value={t.harmful_content} danger />
            <Flag label="Bias issue" value={t.bias_issue} danger />
            <Flag label="Agent got tricked" value={t.agent_got_tricked} danger />
            <Flag label="Instruction ignored" value={t.instruction_ignored} danger />
            <Flag label="Problem prompt" value={t.is_problem_prompt} />
            <Flag label="Kaitus" value={t.is_kaitus} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {t.expected_answered && (
              <div className="rounded-md border border-border bg-background/50 px-3 py-2">
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Expected answered</p>
                <p className="text-sm text-foreground">{t.expected_answered}</p>
              </div>
            )}
            {t.expected_tool && (
              <div className="rounded-md border border-border bg-background/50 px-3 py-2">
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Expected tool</p>
                <p className="text-sm text-foreground">{t.expected_tool}</p>
              </div>
            )}
            {t.final_response_label && (
              <div className="rounded-md border border-border bg-background/50 px-3 py-2">
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Response label</p>
                <p className="text-sm text-foreground">{t.final_response_label}</p>
              </div>
            )}
            {t.safety_outcome && (
              <div className="rounded-md border border-border bg-background/50 px-3 py-2">
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Safety outcome</p>
                <p className="text-sm text-foreground">{outcomeLabel(t.safety_outcome)}</p>
              </div>
            )}
            {t.tool_performance && (
              <div className="rounded-md border border-border bg-background/50 px-3 py-2">
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Tool performance</p>
                <p className="text-sm text-foreground">{t.tool_performance}</p>
              </div>
            )}
            {t.failure_type && t.failure_type !== "none" && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Failure type</p>
                <p className="text-sm text-destructive">{t.failure_type}</p>
              </div>
            )}
          </div>

          <Field label="Evaluator notes" value={t.evaluator_notes} />

          {/* Section 4: Embedding Text */}
          <SectionTitle icon={Sparkles}>Embedding Text</SectionTitle>
          <Field label="Embedding text" value={t.embedding_text} mono />
        </div>
      </div>
    </section>
  )
}
