import { ZodType } from "zod";

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new Error(result.error.issues[0]?.message || "Check the submitted values.");
  return result.data;
}

export function errorJson(error: unknown, status = 400) {
  return Response.json({ error: error instanceof Error ? error.message : "Check the submitted values." }, { status });
}
