import { NextResponse } from "next/server";

type WorkType = "brief" | "proposal" | "sns" | "minutes" | "report";
type Provider = "openai" | "claude";

type GenerateRequest = {
  projectName?: string;
  brandName?: string;
  workType?: WorkType;
  sourceText?: string;
};

type AiOutput = {
  provider: Provider;
  label: string;
  result: string;
  status: "success" | "skipped" | "error";
  error?: string;
};

const workTypePrompts: Record<WorkType, string> = {
  brief: [
    "광고주 브리프를 마케팅 실무자가 바로 이해할 수 있게 정리한다.",
    "반드시 포함할 항목: 프로젝트 개요, 목표, 타깃, 핵심 메시지, 필수 요구사항, 확인 필요 사항.",
    "불명확한 내용은 추정하지 말고 '확인 필요'로 분리한다."
  ].join("\n"),
  proposal: [
    "마케팅 기획안 초안을 만든다.",
    "반드시 포함할 항목: 캠페인 목표, 타깃 인사이트, 핵심 컨셉, 채널 전략, 실행 아이디어, 운영 체크리스트.",
    "실무자가 내부 공유 문서로 바로 옮길 수 있는 간결한 구조로 작성한다."
  ].join("\n"),
  sns: [
    "SNS 게시물 멘션 초안을 생성한다.",
    "반드시 포함할 항목: 톤앤매너 제안, 짧은 버전 3개, 긴 버전 2개, 해시태그, CTA.",
    "과장 표현을 줄이고 브랜드 맥락에 맞는 자연스러운 문장으로 쓴다."
  ].join("\n"),
  minutes: [
    "회의록을 정리한다.",
    "반드시 포함할 항목: 회의 요약, 주요 논의, 결정 사항, 액션 아이템, 담당자/기한, 후속 확인 사항.",
    "원문에 없는 담당자나 일정은 임의로 만들지 않는다."
  ].join("\n"),
  report: [
    "광고 성과 데이터와 보고 내용을 바탕으로 인사이트를 생성한다.",
    "반드시 포함할 항목: 핵심 성과 요약, 긍정 요인, 리스크, 원인 가설, 다음 액션, 보고용 한 줄 코멘트.",
    "수치가 있으면 그대로 인용하고, 해석과 사실을 구분한다."
  ].join("\n")
};

const isWorkType = (value: unknown): value is WorkType =>
  typeof value === "string" && value in workTypePrompts;

const buildInstructions = (workType: WorkType) =>
  [
    "너는 한국어로 일하는 시니어 마케팅 플래너다.",
    "입력된 원문만 근거로 삼고, 실무자가 바로 복사해 쓸 수 있는 결과물을 만든다.",
    "문서는 제목, 짧은 요약, 항목별 본문 순서로 작성한다.",
    workTypePrompts[workType]
  ].join("\n");

const buildInput = ({
  projectName,
  brandName,
  workType,
  sourceText
}: Required<GenerateRequest>) =>
  [
    `프로젝트명: ${projectName.trim()}`,
    `브랜드명: ${brandName.trim()}`,
    `업무 유형: ${workType}`,
    "",
    "원문:",
    sourceText.trim()
  ].join("\n");

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
      error: "OpenAI API 요청에 실패했습니다."
    };
  }

  const payload = (await response.json()) as { output_text?: string };

  return {
    provider: "openai",
    label: "OpenAI",
    result: payload.output_text ?? "",
    status: "success"
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
      max_tokens: 1800,
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
      error: "Claude API 요청에 실패했습니다."
    };
  }

  const payload = (await response.json()) as {
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
    status: "success"
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequest;
    const { projectName, brandName, workType, sourceText } = body;

    if (!projectName?.trim() || !brandName?.trim() || !sourceText?.trim()) {
      return NextResponse.json(
        { error: "프로젝트명, 브랜드명, 원문을 모두 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!isWorkType(workType)) {
      return NextResponse.json(
        { error: "지원하지 않는 업무 유형입니다." },
        { status: 400 }
      );
    }

    const instructions = buildInstructions(workType);
    const input = buildInput({
      projectName,
      brandName,
      workType,
      sourceText
    });

    const settled = await Promise.allSettled([
      generateOpenAi(instructions, input),
      generateClaude(instructions, input)
    ]);

    const outputs = settled.map((item, index): AiOutput => {
      if (item.status === "fulfilled") return item.value;

      return {
        provider: index === 0 ? "openai" : "claude",
        label: index === 0 ? "OpenAI" : "Claude",
        result: "",
        status: "error",
        error: "모델 호출 중 오류가 발생했습니다."
      };
    });

    const hasResult = outputs.some((output) => output.status === "success");

    if (!hasResult) {
      return NextResponse.json(
        {
          error:
            "사용 가능한 AI 결과가 없습니다. API 키 설정을 확인해 주세요.",
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
