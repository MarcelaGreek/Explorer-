export type Trace = {
  run_id: string
  date_time: string | null
  thread_id: string | null
  model: string | null
  system_prompt_version: string | null
  system_prompt: string | null
  user_input: string | null
  tool_called: string | null
  tool_input: string | null
  tool_status: string | null
  tool_output_or_error: string | null
  final_response: string | null
  risk_domain: string | null
  intent_category: string | null
  is_problem_prompt: boolean | null
  is_kaitus: boolean | null
  expected_answered: string | null
  expected_tool: string | null
  final_response_label: string | null
  safety_outcome: string | null
  refusal_expected: boolean | null
  harmful_content: boolean | null
  bias_issue: boolean | null
  agent_got_tricked: boolean | null
  tool_performance: string | null
  instruction_ignored: boolean | null
  failure_type: string | null
  evaluator_notes: string | null
  tag_1: string | null
  tag_2: string | null
  embedding_text: string | null
}

export type TraceWithSimilarity = Trace & { similarity?: number }

export type SemanticMatch = {
  similarity: number
  trace: Trace
}

export const TRACE_COLUMNS =
  "run_id,date_time,thread_id,model,system_prompt_version,system_prompt,user_input,tool_called,tool_input,tool_status,tool_output_or_error,final_response,risk_domain,intent_category,is_problem_prompt,is_kaitus,expected_answered,expected_tool,final_response_label,safety_outcome,refusal_expected,harmful_content,bias_issue,agent_got_tricked,tool_performance,instruction_ignored,failure_type,evaluator_notes,tag_1,tag_2,embedding_text"
