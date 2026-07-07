import type { FilterState } from "@/lib/filters"

export type QuickFilter =
  | { id: string; label: string; kind: "view"; viewName: string }
  | { id: string; label: string; kind: "filter"; apply: (base: FilterState) => FilterState }

/**
 * Quick filter chips. "view" chips select the matching saved research
 * question (same as picking it from the dropdown). "filter" chips reset the
 * source to All traces and apply a direct deterministic column filter -
 * there is no dedicated saved view for these.
 */
export const QUICK_FILTERS: QuickFilter[] = [
  {
    id: "all_failures",
    label: "All failures",
    kind: "filter",
    apply: (f) => ({ ...f, dropdown: { ...f.dropdown, safety_outcome: "fail" } }),
  },
  { id: "refusal_failures", label: "Refusal failures", kind: "view", viewName: "v_q03_refusal_failures" },
  { id: "over_refusals", label: "Over-refusals", kind: "view", viewName: "v_q05_over_refusals" },
  { id: "tool_not_needed", label: "Tool called when not needed", kind: "view", viewName: "v_q06_not_needed_tool_called" },
  { id: "tool_needed_not_called", label: "Tool needed but not called", kind: "view", viewName: "v_q07_tool_needed_not_called" },
  { id: "tool_errors", label: "Tool errors", kind: "view", viewName: "v_q08_tool_errors" },
  {
    id: "animal_harm",
    label: "Animal harm",
    kind: "filter",
    apply: (f) => ({ ...f, dropdown: { ...f.dropdown, risk_domain: "animal_harm" } }),
  },
  {
    id: "bias",
    label: "Bias",
    kind: "filter",
    apply: (f) => ({ ...f, boolean: { ...f.boolean, bias_issue: "true" } }),
  },
  {
    id: "kaitus",
    label: "Kaitus",
    kind: "filter",
    apply: (f) => ({ ...f, boolean: { ...f.boolean, is_kaitus: "true" } }),
  },
  { id: "immigration_bias", label: "Immigration bias", kind: "view", viewName: "v_q12_immigration_bias" },
  { id: "gender_bias", label: "Gender bias", kind: "view", viewName: "v_q13_gender_bias" },
]
