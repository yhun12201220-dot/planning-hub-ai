import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type WorkType = "brief" | "proposal" | "sns" | "minutes" | "report";

type SaveRequest = {
  projectName?: string;
  brandName?: string;
  workType?: WorkType;
  sourceText?: string;
  primaryResult?: string;
  outputs?: unknown;
};

const isWorkType = (value: unknown): value is WorkType =>
  typeof value === "string" &&
  ["brief", "proposal", "sns", "minutes", "report"].includes(value);

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("marketing_outputs")
      .select("id, project_name, brand_name, work_type, created_at")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "저장 목록을 불러오지 못했습니다."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveRequest;
    const {
      projectName,
      brandName,
      workType,
      sourceText,
      primaryResult,
      outputs
    } = body;

    if (
      !projectName?.trim() ||
      !brandName?.trim() ||
      !sourceText?.trim() ||
      !primaryResult?.trim() ||
      !isWorkType(workType)
    ) {
      return NextResponse.json(
        { error: "저장에 필요한 값이 부족합니다." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("marketing_outputs")
      .insert({
        project_name: projectName.trim(),
        brand_name: brandName.trim(),
        work_type: workType,
        source_text: sourceText.trim(),
        primary_result: primaryResult.trim(),
        outputs: outputs ?? []
      })
      .select("id, project_name, brand_name, work_type, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ result: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "결과 저장에 실패했습니다."
      },
      { status: 500 }
    );
  }
}
