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
  }
> = {
  proposal: {
    label: "기획안 생성",
    promptTitle: "기획안 생성",
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
  { id: "summary", label: "짧게 요약" },
  { id: "report-lines", label: "보고용 2줄로 변환" },
  { id: "sns", label: "SNS 멘션으로 변환" },
  { id: "minutes", label: "회의 공유용으로 변환" }
] as const;

export type TransformActionId = (typeof transformActions)[number]["id"];

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

export function normalizeSavedOutputs(item: Partial<SavedResult>): AiOutput[] {
  if (Array.isArray(item.outputs) && item.outputs.length > 0) {
    return item.outputs;
  }

  const fallbackResult = getPreferredResultText(item);

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
  transformAction?: TransformActionId | null;
}) {
  const meta = workTypeMeta[workType];
  const sections = meta.sections.join("\n");
  const toneInstruction = toneInstructionMap[tone];

  const transformInstruction = (() => {
    switch (transformAction) {
      case "summary":
        return "결과를 짧고 밀도 있게 압축한다. 불필요한 배경 설명은 줄이고 바로 공유 가능한 요약형으로 쓴다.";
      case "report-lines":
        return "광고주 보고용 2줄 인사이트를 가장 중요한 결과물로 본다. 나머지 항목도 간결하게 유지한다.";
      case "sns":
        return "현재 결과를 SNS 게시용 문안으로 다시 구성한다.";
      case "minutes":
        return "현재 결과를 회의 공유용 정리본처럼 재구성한다.";
      default:
        return "";
    }
  })();

  return [
    "너는 실무형 마케팅 플래너다.",
    `현재 작업은 ${meta.promptTitle}이다.`,
    toneInstruction,
    "결과는 한국어로 작성한다.",
    "마케터가 제안서, 보고서, 노션, 슬랙에 바로 붙여넣을 수 있도록 제목, 불릿, 체크리스트 중심으로 정리한다.",
    "항목 제목은 반드시 아래 순서를 유지한다.",
    sections,
    "입력에 없는 사실은 단정하지 말고, 필요한 경우 '확인 필요'로 표시한다.",
    transformInstruction
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPromptInput(
  form: Partial<MarketingFormState> & { workType: WorkType }
) {
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
    ["원문 입력", form.sourceText]
  ]
    .filter(([, value]) => typeof value === "string" && value.trim())
    .map(([label, value]) => `${label}: ${String(value).trim()}`);

  return rows.join("\n");
}

export function mapTransformToPayload(action: TransformActionId) {
  switch (action) {
    case "summary":
      return {
        workType: "report" as WorkType,
        tone: "대표 보고용" as ToneOption,
        requiredPoints: "전체 내용을 짧게 요약하고 핵심만 남겨줘."
      };
    case "report-lines":
      return {
        workType: "report" as WorkType,
        tone: "광고주 보고용" as ToneOption,
        requiredPoints:
          "광고주 보고용 2줄 인사이트를 가장 중요하게 작성하고, 나머지는 간단히 정리해줘."
      };
    case "sns":
      return {
        workType: "sns" as WorkType,
        tone: "SNS 업로드용" as ToneOption,
        requiredPoints:
          "현재 결과를 바탕으로 SNS 업로드 문안으로 변환해줘."
      };
    case "minutes":
      return {
        workType: "minutes" as WorkType,
        tone: "회의록용" as ToneOption,
        requiredPoints:
          "현재 결과를 회의 공유용 정리본처럼 재구성해줘."
      };
  }
}
