import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listStudents from "./tools/list-students";
import listInvoices from "./tools/list-invoices";
import getInvoice from "./tools/get-invoice";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lessonpaid-mcp",
  title: "LessonPaid",
  version: "0.1.0",
  instructions:
    "Tools for LessonPaid, a tutoring invoice app. Use `list_students` to see the tutor's students, `list_invoices` to browse invoices (optionally filter by status), and `get_invoice` for full detail including line items.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listStudents, listInvoices, getInvoice],
});
