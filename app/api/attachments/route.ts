import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Attachment } from "@/lib/marketing";

const BUCKET = "marketing-attachments" as const;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);
const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "pdf",
  "pptx",
  "docx",
  "xlsx"
]);

function toSafeFileName(name: string) {
  const normalized = name.normalize("NFKD").replace(/[^\w.\-]+/g, "-");
  return normalized.replace(/-+/g, "-").replace(/^-|-$/g, "") || "attachment";
}

function getFileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "업로드할 파일이 없습니다." },
        { status: 400 }
      );
    }

    const extension = getFileExtension(file.name);

    if (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일은 25MB 이하만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    const safeFileName = toSafeFileName(file.name);
    const path = `attachments/${Date.now()}-${safeFileName}`;
    const supabase = createAdminClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      return NextResponse.json(
        {
          error:
            "첨부파일 업로드에 실패했습니다. Supabase Storage의 marketing-attachments 버킷을 확인해 주세요."
        },
        { status: 500 }
      );
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const attachment: Attachment = {
      name: file.name,
      type: file.type,
      size: file.size,
      path,
      bucket: BUCKET,
      url: data.publicUrl,
      uploadedAt: new Date().toISOString()
    };

    return NextResponse.json({ attachment });
  } catch (error) {
    console.error("Attachment Upload Error", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "첨부파일 업로드 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { path?: string };

    if (!body.path) {
      return NextResponse.json(
        { error: "삭제할 파일 경로가 없습니다." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(BUCKET).remove([body.path]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Attachment Delete Error", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "첨부파일 삭제 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
