import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, students, today } = await req.json();
    if (!transcript || typeof transcript !== "string") {
      return json({ error: "transcript is required" }, 400);
    }
    if (!Array.isArray(students)) {
      return json({ error: "students[] required" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not set" }, 500);

    const todayStr = today || new Date().toISOString().slice(0, 10);

    const systemPrompt = `You extract tutoring invoice data from a spoken transcript.
Today's date is ${todayStr}.
You will be given a list of known students. Pick the best matching student name from that list — use the student's exact full_name from the list in your output.
Extract every lesson date mentioned. Return dates as YYYY-MM-DD. Resolve ambiguous month-only dates using the most recent past or current month context (assume the current year unless clearly stated otherwise; if the date would be in the future by more than 2 months, assume previous year).
Optionally extract per-lesson duration in hours if explicitly mentioned (e.g. "two hour lesson on May 6"). Otherwise omit duration.
If the student cannot be confidently matched, set student_full_name to an empty string.`;

    const userPrompt = `Known students:\n${students
      .map((s: { full_name: string }) => `- ${s.full_name}`)
      .join("\n")}\n\nTranscript:\n"""${transcript}"""`;

    const tool = {
      type: "function",
      function: {
        name: "create_invoice_from_dictation",
        description: "Return the parsed student and lesson dates.",
        parameters: {
          type: "object",
          properties: {
            student_full_name: {
              type: "string",
              description: "Exact full_name from the provided student list, or empty string if no confident match.",
            },
            lessons: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string", description: "YYYY-MM-DD" },
                  duration_hours: { type: "number" },
                },
                required: ["date"],
                additionalProperties: false,
              },
            },
            notes: { type: "string", description: "Optional free-form notes mentioned by the user." },
          },
          required: ["student_full_name", "lessons"],
          additionalProperties: false,
        },
      },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "create_invoice_from_dictation" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return json({ error: "Rate limit exceeded, please try again shortly." }, 429);
      if (resp.status === 402) return json({ error: "AI credits exhausted. Please add credits in workspace settings." }, 402);
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return json({ error: "No tool call returned" }, 500);
    const args = JSON.parse(call.function.arguments);
    return json(args, 200);
  } catch (e) {
    console.error("parse-dictation error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
