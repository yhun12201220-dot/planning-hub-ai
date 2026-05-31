export type WorkType =
  | "proposal"
  | "sns"
  | "minutes"
  | "report"
  | "event"
  | "brief";

export type Provider = "openai" | "claude";

export type ToneOption =
  | "기본"
  | "내부 공유용"
  | "광고주 보고용"
  | "제안서용"
  | "SNS 업로드용"
  | "회의록용"
  | "대표 보고용";

export type ResultStatus =
  | "초안"
  | "수정 필요"
  | "검토 요청"
  | "확정"
  | "사용 완료";

export type SortOrder = "latest" | "oldest";

export type AiOutput = {
  provider: Provider;
  label: string;
  result: string;
  status: "success" | "skipped" | "error";
  error?: string;
};

export type Attachment = {
  name: string;
  type: string;
  size: number;
  url: string;
  path: string;
  bucket: "marketing-attachments";
  uploadedAt: string;
};

export type AttachmentMetadata = Pick<Attachment, "name" | "type" | "size" | "url">;

export type GeneratedImage = {
  name: string;
  prompt: string;
  url: string;
  path: string;
  bucket: "marketing-generated-images";
  size: string;
  createdAt: string;
};

export type MarketingFormState = {
  projectName: string;
  brandName: string;
  workType: WorkType;
  tone: ToneOption;
  target: string;
  objective: string;
  keyMessage: string;
  requiredPoints: string;
  excludedPoints: string;
  referenceText: string;
  sourceText: string;
};

export type SavedResult = {
  id: string;
  title: string | null;
  project_name: string;
  brand_name: string;
  work_type: WorkType;
  tone: string | null;
  target: string | null;
  objective: string | null;
  key_message: string | null;
  required_points: string | null;
  excluded_points: string | null;
  reference_text: string | null;
  source_text: string;
  result_text: string | null;
  result: string | null;
  primary_result: string | null;
  status: ResultStatus | null;
  tags: string[] | null;
  outputs: AiOutput[] | null;
  attachments: Attachment[] | null;
  generated_images: GeneratedImage[] | null;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string | null;
};

export type SearchFilters = {
  query: string;
  workType: "all" | WorkType;
  status: "all" | ResultStatus;
  brand: string;
  tag: string;
  sort: SortOrder;
};

export const workTypeOptions: Array<{
  value: WorkType;
  label: string;
  description: string;
}> = [
  {
    value: "proposal",
    label: "기획안 생성",
    description: "캠페인 전략과 실행 아이디어를 구조화"
  },
  {
    value: "sns",
    label: "SNS 멘션",
    description: "채널별 문안과 해시태그를 빠르게 정리"
  },
  {
    value: "minutes",
    label: "회의록 정리",
    description: "결정사항과 액션 아이템 중심으로 정리"
  },
  {
    value: "report",
    label: "보고서 인사이트",
    description: "성과 요약과 다음 액션을 실무형으로 정리"
  },
  {
    value: "event",
    label: "이벤트 구조화",
    description: "참여 방식과 운영 체크리스트를 한 번에 정리"
  }
];

export const toneOptions: ToneOption[] = [
  "기본",
  "내부 공유용",
  "광고주 보고용",
  "제안서용",
  "SNS 업로드용",
  "회의록용",
  "대표 보고용"
];

export const resultStatusOptions: ResultStatus[] = [
  "초안",
  "수정 필요",
  "검토 요청",
  "확정",
  "사용 완료"
];

export const initialFormState: MarketingFormState = {
  projectName: "",
  brandName: "",
  workType: "proposal",
  tone: "기본",
  target: "",
  objective: "",
  keyMessage: "",
  requiredPoints: "",
  excludedPoints: "",
  referenceText: "",
  sourceText: ""
};

const workTypeMeta: Record<
  WorkType,
  {
    label: string;
    promptTitle: string;
    sections: string[];
    roleGuide: string;
  }
> = {
  proposal: {
    label: "기획안 생성",
    promptTitle: "기획안 생성",
    roleGuide:
      "광고주 제안서에 바로 넣을 수 있게 배경-전략-실행-성과가 한 흐름으로 이어지게 쓴다.",
    sections: [
      "1. 캠페인 요약",
      "2. 문제 정의 / 배경",
      "3. 타깃 인사이트",
      "4. 핵심 전략",
      "5. 콘텐츠 방향",
      "6. 실행 아이디어",
      "7. 채널 운영안",
      "8. KPI / 기대효과",
      "9. 보고용 한 줄 정리"
    ]
  },
  sns: {
    label: "SNS 멘션",
    promptTitle: "SNS 멘션",
    roleGuide:
      "실제 SNS 운영자가 바로 게시하거나 일부만 골라 쓸 수 있게 문장 완성도를 높인다.",
    sections: [
      "1. A안: 깔끔한 브랜드 톤",
      "2. B안: 후킹 강한 톤",
      "3. C안: 정보 전달형 톤",
      "4. D안: 릴스 자막형 톤",
      "5. 추천 해시태그",
      "6. 스토리용 짧은 문구",
      "7. 썸네일 문구"
    ]
  },
  minutes: {
    label: "회의록 정리",
    promptTitle: "회의록 정리",
    roleGuide:
      "회의 후 팀원이 바로 움직일 수 있게 결정사항, 담당, 마감, 확인 필요 항목을 명확히 쓴다.",
    sections: [
      "1. 회의 개요",
      "2. 핵심 논의사항",
      "3. 결정사항",
      "4. To-do 리스트",
      "5. 담당자",
      "6. 마감일",
      "7. 확인 필요 사항",
      "8. 다음 회의 전 준비사항"
    ]
  },
  report: {
    label: "보고서 인사이트",
    promptTitle: "보고서 인사이트",
    roleGuide:
      "광고주와 내부 팀 모두 이해할 수 있게 성과 해석, 원인, 다음 액션을 근거 중심으로 쓴다.",
    sections: [
      "1. 전체 성과 요약",
      "2. 긍정 포인트",
      "3. 아쉬운 포인트",
      "4. 원인 분석",
      "5. 다음 액션",
      "6. 광고주 보고용 2줄 인사이트",
      "7. 내부 공유용 한 줄 코멘트"
    ]
  },
  event: {
    label: "이벤트 구조화",
    promptTitle: "이벤트 구조화",
    roleGuide:
      "운영자가 바로 체크하며 실행할 수 있게 참여 방식, 운영 조건, 리스크를 구체화한다.",
    sections: [
      "1. 이벤트 목적",
      "2. 타깃",
      "3. 참여 방식",
      "4. 운영 기간",
      "5. 경품/혜택 구조",
      "6. 유의사항",
      "7. 운영 체크리스트",
      "8. 리스크 및 확인사항",
      "9. 기대효과"
    ]
  },
  brief: {
    label: "브리프 정리",
    promptTitle: "기획안 생성",
    roleGuide:
      "흩어진 광고주 브리프를 실행 가능한 기획 방향으로 재정리한다.",
    sections: [
      "1. 캠페인 요약",
      "2. 문제 정의 / 배경",
      "3. 타깃 인사이트",
      "4. 핵심 전략",
      "5. 콘텐츠 방향",
      "6. 실행 아이디어",
      "7. 채널 운영안",
      "8. KPI / 기대효과",
      "9. 보고용 한 줄 정리"
    ]
  }
};

const toneInstructionMap: Record<ToneOption, string> = {
  기본: "균형 잡힌 마케팅 실무 문체로 정리한다.",
  "내부 공유용": "간결하고 실행 중심으로 쓴다. 바로 할 일과 우선순위가 드러나야 한다.",
  "광고주 보고용": "긍정적이지만 과장하지 않는 톤으로 쓴다. 근거와 리스크를 분리한다.",
  "제안서용": "설득력 있고 구조적인 톤으로 쓴다. 핵심 논리를 선명하게 보여준다.",
  "SNS 업로드용": "자연스럽고 후킹 있는 문체로 쓴다. 읽는 흐름이 가볍고 명확해야 한다.",
  "회의록용": "사실 중심으로 쓴다. 결정사항과 액션 아이템이 우선이다.",
  "대표 보고용": "핵심 요약과 의사결정 포인트 중심으로 압축해서 쓴다."
};

export const transformActions = [
  { id: "shorter", label: "더 짧게" },
  { id: "hookier", label: "더 후킹하게" },
  { id: "client-report", label: "광고주 보고용" },
  { id: "ppt-summary", label: "PPT 장표용 요약" },
  { id: "execution-focused", label: "실행안 중심으로" },
  { id: "add-kpi", label: "KPI 추가" },
  { id: "risk-improve", label: "리스크 보완" }
] as const;

export const creativeActions = [
  { id: "image-concepts", label: "이미지 시안 생성" },
  { id: "image-prompts", label: "이미지 프롬프트 생성" },
  { id: "reference-analysis", label: "레퍼런스 분석" }
] as const;

export type TransformActionId = (typeof transformActions)[number]["id"];
export type CreativeActionId = (typeof creativeActions)[number]["id"];
export type GenerationActionId = TransformActionId | CreativeActionId;

export function isWorkType(value: unknown): value is WorkType {
  return typeof value === "string" && value in workTypeMeta;
}

export function isToneOption(value: unknown): value is ToneOption {
  return typeof value === "string" && toneOptions.includes(value as ToneOption);
}

export function isResultStatus(value: unknown): value is ResultStatus {
  return (
    typeof value === "string" &&
    resultStatusOptions.includes(value as ResultStatus)
  );
}

export function getWorkTypeLabel(workType: string) {
  return workTypeMeta[workType as WorkType]?.label ?? workType;
}

export function getPreferredResultText(item: Partial<SavedResult>) {
  return item.result_text || item.result || item.primary_result || "";
}

export function getSavedResultDisplayText(item: Partial<SavedResult>) {
  return (
    item.result_text ||
    item.primary_result ||
    item.outputs?.[0]?.result ||
    item.result ||
    ""
  );
}

export function normalizeSavedOutputs(item: Partial<SavedResult>): AiOutput[] {
  const fallbackResult = getSavedResultDisplayText(item);

  if (Array.isArray(item.outputs) && item.outputs.length > 0) {
    const firstOutput = item.outputs[0];

    if (firstOutput && firstOutput.result !== fallbackResult && fallbackResult) {
      return [
        {
          ...firstOutput,
          result: fallbackResult,
          status: "success"
        },
        ...item.outputs.slice(1)
      ];
    }

    return item.outputs;
  }

  return fallbackResult
    ? [
        {
          provider: "openai",
          label: "Saved",
          result: fallbackResult,
          status: "success"
        }
      ]
    : [];
}

export function parseTags(input: string | string[] | null | undefined) {
  if (Array.isArray(input)) {
    return input
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (!input) {
    return [];
  }

  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function buildDefaultTitle({
  projectName,
  brandName,
  workType
}: {
  projectName?: string | null;
  brandName?: string | null;
  workType: WorkType;
}) {
  const label = getWorkTypeLabel(workType);
  const today = new Intl.DateTimeFormat("sv-SE").format(new Date());

  if (projectName?.trim()) {
    return `[${label}] ${projectName.trim()}`;
  }

  if (brandName?.trim()) {
    return `[${label}] ${brandName.trim()}`;
  }

  return `[${label}] 저장 결과 ${today}`;
}

export function buildPromptInstructions({
  workType,
  tone,
  transformAction
}: {
  workType: WorkType;
  tone: ToneOption;
  transformAction?: GenerationActionId | null;
}) {
  const meta = workTypeMeta[workType];
  const sections = meta.sections.join("\n");
  const toneInstruction = toneInstructionMap[tone];

  const transformInstruction = (() => {
    switch (transformAction) {
      case "shorter":
        return "현재 결과를 더 짧게 압축한다. 제목, 핵심 요약 3줄, 바로 할 일 3개, 보고용 한 문장만 남긴다.";
      case "hookier":
        return "현재 결과를 더 후킹하게 바꾼다. 과장 없이 첫 문장, 캠페인 메시지, SNS/제안서용 표현의 주목도를 높인다.";
      case "client-report":
        return "현재 결과를 광고주 보고용으로 재작성한다. 긍정적이지만 과장하지 말고 성과, 근거, 다음 액션, 확인 필요 리스크를 분리한다.";
      case "ppt-summary":
        return "현재 결과를 PPT 한두 장에 바로 넣을 수 있게 재구성한다. 슬라이드 제목, 핵심 메시지, 본문 불릿, 발표자 노트용 한 문장으로 압축한다.";
      case "execution-focused":
        return "현재 결과를 실행안 중심으로 재구성한다. 우선순위, 담당 파트, 진행 순서, 체크리스트, 즉시 실행 가능한 액션을 강화한다.";
      case "add-kpi":
        return "현재 결과에 KPI를 추가한다. 핵심 KPI, 보조 KPI, 측정 방법, 확인 주기, 기대효과를 현실적으로 제안한다.";
      case "risk-improve":
        return "현재 결과의 리스크를 보완한다. 운영 리스크, 메시지 리스크, 승인/법무 확인 사항, 대응안을 체크리스트로 추가한다.";
      case "image-concepts":
        return "현재 기획안 또는 SNS 멘션을 바탕으로 광고 이미지 시안 A/B/C를 만든다. 각 시안은 컨셉, 비주얼, 배경, 제품 노출, 구도, 톤앤매너, 활용 채널을 반드시 포함한다.";
      case "image-prompts":
        return "현재 결과와 입력값을 바탕으로 GPT Image, Midjourney, Flux, Stable Diffusion에서 바로 쓸 수 있는 영문 이미지 프롬프트를 만든다. 4:5 SNS 광고용, 상업 광고 사진 품질, 제품 노출, 구도, 조명, 배경, 브랜드 무드를 포함한다.";
      case "reference-analysis":
        return "첨부 파일명, 파일 타입, 참고 레퍼런스, 사용자 입력을 바탕으로 레퍼런스 분석을 작성한다. 실제 이미지 픽셀을 분석했다고 말하지 말고, 제공된 정보 기반의 활용 가능한 추정으로 정리한다.";
      default:
        return "";
    }
  })();

  return [
    "너는 실무형 마케팅 플래너다.",
    `현재 작업은 ${meta.promptTitle}이다.`,
    meta.roleGuide,
    toneInstruction,
    "결과는 한국어로 작성한다.",
    "마케터가 제안서, 보고서, 노션, 슬랙에 바로 붙여넣을 수 있도록 완성된 문장으로 쓴다.",
    "모든 결과는 반드시 '제목', '요약', '실행안', '체크리스트', '보고용 문장'이 눈에 띄게 포함되도록 구성한다.",
    "각 섹션은 제목 1줄, 핵심 불릿, 필요 시 체크박스로 정리한다.",
    "실행안은 추상적인 방향이 아니라 마케터가 오늘 할 수 있는 액션으로 쓴다.",
    "보고용 문장은 광고주/대표/팀 공유에 바로 붙일 수 있는 자연스러운 문장으로 쓴다.",
    "성과, KPI, 리스크가 입력에 있거나 업무 유형상 필요하면 별도 불릿으로 정리한다.",
    "항목 제목은 반드시 아래 순서를 유지한다.",
    sections,
    "입력에 없는 사실은 단정하지 말고, 필요한 경우 '확인 필요'로 표시한다.",
    transformInstruction
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPromptInput(
  form: Partial<MarketingFormState> & {
    workType: WorkType;
    attachments?: AttachmentMetadata[];
  }
) {
  const attachmentSummary = form.attachments?.length
    ? form.attachments
        .map((file) => `${file.name} (${file.type || "unknown"})`)
        .join(", ")
    : "";

  const rows = [
    ["프로젝트명", form.projectName],
    ["브랜드명", form.brandName],
    ["업무 유형", getWorkTypeLabel(form.workType)],
    ["톤앤매너", form.tone],
    ["타깃", form.target],
    ["목표", form.objective],
    ["핵심 메시지", form.keyMessage],
    ["필수 포함 내용", form.requiredPoints],
    ["제외할 내용", form.excludedPoints],
    ["참고 레퍼런스", form.referenceText],
    ["레퍼런스 첨부", attachmentSummary],
    ["원문 입력", form.sourceText]
  ]
    .filter(([, value]) => typeof value === "string" && value.trim())
    .map(([label, value]) => `${label}: ${String(value).trim()}`);

  return rows.join("\n");
}

export function mapTransformToPayload(action: TransformActionId) {
  switch (action) {
    case "shorter":
      return {
        workType: "report" as WorkType,
        tone: "대표 보고용" as ToneOption,
        requiredPoints:
          "현재 결과를 더 짧게 줄여줘. 제목, 핵심 요약 3줄, 실행안 3개, 보고용 한 문장만 남겨줘."
      };
    case "hookier":
      return {
        workType: "sns" as WorkType,
        tone: "SNS 업로드용" as ToneOption,
        requiredPoints:
          "현재 결과를 더 후킹하게 바꿔줘. 첫 문장, 핵심 메시지, 썸네일/릴스 문구를 강하게 제안해줘."
      };
    case "client-report":
      return {
        workType: "report" as WorkType,
        tone: "광고주 보고용" as ToneOption,
        requiredPoints:
          "현재 결과를 광고주에게 공유할 보고용 문장으로 재작성해줘. 성과, 근거, 다음 액션, 확인 필요 사항을 분리해줘."
      };
    case "ppt-summary":
      return {
        workType: "report" as WorkType,
        tone: "대표 보고용" as ToneOption,
        requiredPoints:
          "현재 결과를 PPT 장표에 바로 넣을 수 있게 요약해줘. 슬라이드 제목, 핵심 메시지, 본문 불릿, 발표자 노트용 문장으로 정리해줘."
      };
    case "execution-focused":
      return {
        workType: "event" as WorkType,
        tone: "내부 공유용" as ToneOption,
        requiredPoints:
          "현재 결과를 실행안 중심으로 재구성해줘. 우선순위, 진행 순서, 담당 파트, 체크리스트를 구체적으로 작성해줘."
      };
    case "add-kpi":
      return {
        workType: "report" as WorkType,
        tone: "광고주 보고용" as ToneOption,
        requiredPoints:
          "현재 결과에 KPI를 보완해줘. 핵심 KPI, 보조 KPI, 측정 방법, 확인 주기, 기대효과를 추가해줘."
      };
    case "risk-improve":
      return {
        workType: "event" as WorkType,
        tone: "내부 공유용" as ToneOption,
        requiredPoints:
          "현재 결과의 리스크를 보완해줘. 운영 리스크, 메시지 리스크, 승인/법무 확인 사항, 대응안을 체크리스트로 추가해줘."
      };
  }
}

export function mapCreativeActionToPayload(action: CreativeActionId) {
  switch (action) {
    case "image-concepts":
      return {
        workType: "proposal" as WorkType,
        tone: "제안서용" as ToneOption,
        requiredPoints:
          "현재 결과를 바탕으로 이미지 시안 A/B/C를 만들어줘. 각 시안은 컨셉, 비주얼, 배경, 제품 노출, 구도, 톤앤매너, 활용 채널을 포함해줘."
      };
    case "image-prompts":
      return {
        workType: "sns" as WorkType,
        tone: "SNS 업로드용" as ToneOption,
        requiredPoints:
          "현재 결과와 입력값을 바탕으로 GPT Image, Midjourney, Flux, Stable Diffusion에서 바로 쓸 수 있는 영문 이미지 프롬프트를 각각 작성해줘. 4:5 SNS 광고용으로 작성해줘."
      };
    case "reference-analysis":
      return {
        workType: "proposal" as WorkType,
        tone: "내부 공유용" as ToneOption,
        requiredPoints:
          "첨부 파일명, 파일 타입, 참고 레퍼런스, 사용자 입력을 기반으로 레퍼런스 분석을 작성해줘. 색감, 구도, 카피 위치, 모델 특징, 브랜드 무드, 디자인 특징, 활용 포인트, 유사 제작 방향을 포함해줘."
      };
  }
}
