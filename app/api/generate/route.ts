import { NextResponse } from "next/server";
import {
  AiOutput,
  AttachmentMetadata,
  GenerationActionId,
  MarketingFormState,
  ToneOption,
  WorkType,
  buildPromptInput,
  buildPromptInstructions,
  isToneOption,
  isWorkType
} from "@/lib/marketing";

type GenerateRequest = Partial<MarketingFormState> & {
  workType?: WorkType;
  transformAction?: GenerationActionId | null;
  attachments?: AttachmentMetadata[];
};

async function readProviderJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as Record<string, any>;
  }

  const text = await response.text().catch(() => "");
  throw new Error(
    text.trim() || "AI 제공사 응답 형식이 올바르지 않습니다."
  );
}

function normalizeAttachmentMetadata(
  attachments: GenerateRequest["attachments"]
): AttachmentMetadata[] {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .map((item) => ({
      name: String(item?.name ?? ""),
      type: String(item?.type ?? ""),
      size: Number(item?.size ?? 0),
      url: String(item?.url ?? "")
    }))
    .filter((item) => item.name && item.url);
}

async function generateOpenAi(
  instructions: string,
  input: string
): Promise<AiOutput> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      label: "OpenAI",
      result: "",
      status: "skipped",
      error: "OPENAI_API_KEY가 설정되어 있지 않습니다."
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      instructions,
      input
    })
  });

  if (!response.ok) {
    return {
      provider: "openai",
      label: "OpenAI",
      result: "",
      status: "error",
      error: "OpenAI 결과 생성에 실패했습니다."
    };
  }

  const payload = await readProviderJson(response);
  const outputText =
    payload.output_text ??
    payload.output?.[0]?.content?.[0]?.text ??
    payload.output?.[0]?.content?.[0]?.value ??
    "";

  return {
    provider: "openai",
    label: "OpenAI",
    result: outputText,
    status: outputText ? "success" : "error",
    error: outputText ? undefined : "OpenAI 응답에서 결과 텍스트를 찾지 못했습니다."
  };
}

async function generateClaude(
  instructions: string,
  input: string
): Promise<AiOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "claude",
      label: "Claude",
      result: "",
      status: "skipped",
      error: "ANTHROPIC_API_KEY가 설정되어 있지 않습니다."
    };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
      max_tokens: 2200,
      system: instructions,
      messages: [
        {
          role: "user",
          content: input
        }
      ]
    })
  });

  if (!response.ok) {
    return {
      provider: "claude",
      label: "Claude",
      result: "",
      status: "error",
      error: "Claude 결과 생성에 실패했습니다."
    };
  }

  const payload = (await readProviderJson(response)) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const result =
    payload.content
      ?.filter((item) => item.type === "text")
      .map((item) => item.text ?? "")
      .join("\n") ?? "";

  return {
    provider: "claude",
    label: "Claude",
    result,
    status: result ? "success" : "error",
    error: result ? undefined : "Claude 응답에서 결과 텍스트를 찾지 못했습니다."
  };
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "AI 생성 요청 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as GenerateRequest;

    if (!isWorkType(body.workType)) {
      return NextResponse.json(
        { error: "지원하지 않는 업무 유형입니다." },
        { status: 400 }
      );
    }

    if (!body.sourceText?.trim()) {
      return NextResponse.json(
        { error: "원문 입력을 채워 주세요." },
        { status: 400 }
      );
    }

    const tone: ToneOption = isToneOption(body.tone) ? body.tone : "기본";
    const promptInput = buildPromptInput({
      projectName: body.projectName ?? "",
      brandName: body.brandName ?? "",
      workType: body.workType,
      tone,
      target: body.target ?? "",
      objective: body.objective ?? "",
      keyMessage: body.keyMessage ?? "",
      requiredPoints: body.requiredPoints ?? "",
      excludedPoints: body.excludedPoints ?? "",
      referenceText: body.referenceText ?? "",
      sourceText: body.sourceText,
      attachments: normalizeAttachmentMetadata(body.attachments)
    });
    const instructions = buildPromptInstructions({
      workType: body.workType,
      tone,
      transformAction: body.transformAction ?? null
    });

    const settled = await Promise.allSettled([
      generateOpenAi(instructions, promptInput),
      generateClaude(instructions, promptInput)
    ]);

    const outputs = settled.map((item, index): AiOutput => {
      if (item.status === "fulfilled") {
        return item.value;
      }

      return {
        provider: index === 0 ? "openai" : "claude",
        label: index === 0 ? "OpenAI" : "Claude",
        result: "",
        status: "error",
        error: "모델 호출 중 오류가 발생했습니다."
      };
    });

    if (!outputs.some((output) => output.status === "success" && output.result)) {
      return NextResponse.json(
        {
          error: "사용 가능한 AI 결과가 없습니다. API 키와 입력값을 확인해 주세요.",
          outputs
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ outputs });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "AI 결과 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
