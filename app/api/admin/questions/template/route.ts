import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { QUESTION_IMPORT_SCHEMAS } from "@/lib/question-import/schemas";
import { buildTemplateCsv } from "@/lib/question-import/template";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const type = request.nextUrl.searchParams.get("type") ?? "";
  const schema = QUESTION_IMPORT_SCHEMAS[type];
  if (!schema) {
    return NextResponse.json({ error: "Dạng câu hỏi không hợp lệ" }, { status: 400 });
  }

  const csv = buildTemplateCsv(schema);

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-template.csv"`,
    },
  });
}
