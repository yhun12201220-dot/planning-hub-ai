import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Attachment,
  ResultStatus,
  SavedResult,
  ToneOption,
  WorkType,
  buildDefaultTitle,
  isResultStatus,
  isToneOption,
  isWorkType,
  parseTags
} from "@/lib/marketing";

type SaveRequest = {
  title?: string;
  projectName?: string;
  brandName?: string;
  workType?: WorkType;
  tone?: ToneOption;
  target?: string;
  objective?: string;
  keyMessage?: string;
  requiredPoints?: string;
  excludedPoints?: string;
  referenceText?: string;
  sourceText?: string;
  primaryResult?: string;
  resultText?: string;
  status?: ResultStatus;
  tags?: string[] | string;
  outputs?: unknown;
  attachments?: Attachment[];
};

const resultSelect = [
  "id",
  "title",
  "project_name",
  "brand_name",
  "work_type",
  "tone",
  "target",
  "objective",
  "key_message",
  "required_points",
  "excluded_points",
  "reference_text",
  "source_text",
  "result_text",
  "primary_result",
  "status",
  "tags",
  "outputs",
  "attachments",
  "created_at",
  "updated_at",
  "is_deleted"
].join(", ");

function mapRow(row: SavedResult) {
  const displayResult =
    row.result_text || row.primary_result || row.outputs?.[0]?.result || "";

  return {
    ...row,
    displayTitle: row.title || row.project_name || "무제 결과",
    displayResult,
    previewText: displayResult.slice(0, 120)
  };
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("marketing_outputs")
      .select(resultSelect)
      .or("is_deleted.eq.false,is_deleted.is.null")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      results: ((data ?? []) as unknown as SavedResult[]).map(mapRow)
    });
  } catch (error) {
    console.error("Results API Error", error);

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

    if (!isWorkType(body.workType)) {
      return NextResponse.json(
        { error: "업무 유형이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (!body.sourceText?.trim()) {
      return NextResponse.json(
        { error: "원문 입력이 비어 있습니다." },
        { status: 400 }
      );
    }

    const preferredResult =
      body.resultText?.trim() || body.primaryResult?.trim() || "";

    if (!preferredResult) {
      return NextResponse.json(
        { error: "저장할 AI 결과가 없습니다." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const title =
      body.title?.trim() ||
      (body.projectName?.trim()
        ? `${body.projectName.trim()} - ${body.workType}`
        : buildDefaultTitle({
            projectName: body.projectName,
            brandName: body.brandName,
            workType: body.workType
          }));

    const { data, error } = await supabase
      .from("marketing_outputs")
      .insert({
        title,
        project_name: body.projectName?.trim() ?? "",
        brand_name: body.brandName?.trim() ?? "",
        work_type: body.workType,
        tone: isToneOption(body.tone) ? body.tone : "기본",
        target: body.target?.trim() ?? "",
        objective: body.objective?.trim() ?? "",
        key_message: body.keyMessage?.trim() ?? "",
        required_points: body.requiredPoints?.trim() ?? "",
        excluded_points: body.excludedPoints?.trim() ?? "",
        reference_text: body.referenceText?.trim() ?? "",
        source_text: body.sourceText.trim(),
        result_text: preferredResult,
        primary_result: preferredResult,
        status: isResultStatus(body.status) ? body.status : "초안",
        tags: parseTags(body.tags),
        outputs: body.outputs ?? [],
        attachments: body.attachments ?? [],
        is_deleted: false,
        updated_at: new Date().toISOString()
      })
      .select(resultSelect)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      result: mapRow(data as unknown as SavedResult)
    });
  } catch (error) {
    console.error("Results API Error", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "결과 저장에 실패했습니다."
      },
      { status: 500 }
    );
  }
}
