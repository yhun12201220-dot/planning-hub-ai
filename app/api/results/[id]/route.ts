import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isResultStatus, parseTags } from "@/lib/marketing";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PatchRequest = {
  title?: string;
  status?: string;
  tags?: string[] | string;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = (await request.json()) as PatchRequest;

    if (!id) {
      return NextResponse.json(
        { error: "수정할 결과 ID가 없습니다." },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (typeof body.title === "string") {
      updates.title = body.title.trim();
    }

    if (typeof body.status === "string") {
      if (!isResultStatus(body.status)) {
        return NextResponse.json(
          { error: "상태 값이 올바르지 않습니다." },
          { status: 400 }
        );
      }

      updates.status = body.status;
    }

    if (body.tags !== undefined) {
      updates.tags = parseTags(body.tags);
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("marketing_outputs")
      .update(updates)
      .eq("id", id)
      .or("is_deleted.eq.false,is_deleted.is.null")
      .select(
        "id, title, project_name, brand_name, work_type, tone, target, objective, key_message, required_points, excluded_points, reference_text, source_text, result_text, primary_result, status, tags, outputs, attachments, generated_images, created_at, updated_at, is_deleted"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ result: data as unknown });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "결과 수정에 실패했습니다."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "삭제할 결과 ID가 없습니다." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("marketing_outputs")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .or("is_deleted.eq.false,is_deleted.is.null");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "저장 결과 삭제에 실패했습니다."
      },
      { status: 500 }
    );
  }
}
