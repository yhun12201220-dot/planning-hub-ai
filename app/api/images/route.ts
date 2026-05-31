import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GeneratedImage } from "@/lib/marketing";

export const runtime = "nodejs";

const BUCKET = "marketing-generated-images" as const;

type ImageRequest = {
  prompt?: string;
  projectName?: string;
  brandName?: string;
};

async function readJsonSafely(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as Record<string, any>;
  }

  const text = await response.text().catch(() => "");
  throw new Error(text.trim() || "이미지 생성 응답 형식이 올바르지 않습니다.");
}

function toSafeFileName(name: string) {
  const normalized = name.normalize("NFKD").replace(/[^\w.\-]+/g, "-");
  return normalized.replace(/-+/g, "-").replace(/^-|-$/g, "") || "image";
}

function buildImagePrompt(prompt: string) {
  return [
    prompt,
    "",
    "Create a 4:5 portrait-oriented social media advertising visual.",
    "Commercial advertising photography, premium lifestyle campaign quality.",
    "Keep the composition crop-safe for Instagram feed. No text overlay unless explicitly requested."
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY가 설정되어 있지 않습니다." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ImageRequest;
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json(
        { error: "이미지 생성에 사용할 프롬프트가 없습니다." },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
        prompt: buildImagePrompt(prompt),
        size: "1024x1536",
        quality: "medium",
        n: 1
      })
    });

    const payload = await readJsonSafely(response);

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            typeof payload.error?.message === "string"
              ? payload.error.message
              : "이미지 생성에 실패했습니다."
        },
        { status: response.status }
      );
    }

    const imageItem = payload.data?.[0];
    const base64 = imageItem?.b64_json;
    const remoteUrl = imageItem?.url;
    let imageBuffer: Buffer;

    if (typeof base64 === "string" && base64) {
      imageBuffer = Buffer.from(base64, "base64");
    } else if (typeof remoteUrl === "string" && remoteUrl) {
      const imageResponse = await fetch(remoteUrl);

      if (!imageResponse.ok) {
        return NextResponse.json(
          { error: "생성 이미지를 저장하기 위해 불러오지 못했습니다." },
          { status: 500 }
        );
      }

      imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    } else {
      return NextResponse.json(
        { error: "이미지 생성 응답에서 이미지 데이터를 찾지 못했습니다." },
        { status: 500 }
      );
    }

    const supabase = createAdminClient();
    const baseName =
      body.projectName?.trim() || body.brandName?.trim() || "creative-image";
    const name = `${toSafeFileName(baseName)}-${Date.now()}.png`;
    const path = `generated/${name}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, imageBuffer, {
      contentType: "image/png",
      upsert: false
    });

    if (error) {
      return NextResponse.json(
        {
          error:
            "생성 이미지를 Supabase Storage에 저장하지 못했습니다. marketing-generated-images 버킷을 확인해 주세요."
        },
        { status: 500 }
      );
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const image: GeneratedImage = {
      name,
      prompt,
      url: data.publicUrl,
      path,
      bucket: BUCKET,
      size: "1024x1536",
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({ image });
  } catch (error) {
    console.error("Image Generation Error", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이미지 생성 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
