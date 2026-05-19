"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  AiOutput,
  Attachment,
  MarketingFormState,
  ResultStatus,
  SavedResult,
  SearchFilters,
  ToneOption,
  TransformActionId,
  WorkType,
  getPreferredResultText,
  getSavedResultDisplayText,
  getWorkTypeLabel,
  initialFormState,
  mapTransformToPayload,
  normalizeSavedOutputs,
  parseTags,
  resultStatusOptions,
  toneOptions,
  transformActions,
  workTypeOptions
} from "@/lib/marketing";

const workflowSteps = [
  "업무 유형 선택",
  "실무 정보 입력",
  "AI 결과 생성",
  "저장/변환",
  "재활용"
];

const initialFilters: SearchFilters = {
  query: "",
  workType: "all",
  status: "all",
  brand: "",
  tag: "",
  sort: "latest"
};

const formatDate = (value: string | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const getDisplayTitle = (item: SavedResult) =>
  item.title?.trim() || item.project_name || item.brand_name || "저장 결과";

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const isImageAttachment = (attachment: Attachment) =>
  attachment.type.startsWith("image/");

export default function Home() {
  const [form, setForm] = useState<MarketingFormState>(initialFormState);
  const [outputs, setOutputs] = useState<AiOutput[]>([]);
  const [activeProvider, setActiveProvider] = useState<"openai" | "claude">(
    "openai"
  );
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SavedResult | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailStatus, setDetailStatus] = useState<ResultStatus>("초안");
  const [detailTagsInput, setDetailTagsInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingDetail, setIsUpdatingDetail] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copyState, setCopyState] = useState("복사하기");
  const [hasSavedCurrentResult, setHasSavedCurrentResult] = useState(false);

  const selectedWorkType =
    workTypeOptions.find((item) => item.value === form.workType) ??
    workTypeOptions[0];

  const activeOutput =
    outputs.find((output) => output.provider === activeProvider) ?? outputs[0];

  const successfulOutputs = outputs.filter(
    (output) => output.status === "success" && output.result
  );

  const isBusy = isLoading || isTransforming;

  const currentStep = useMemo(() => {
    if (!form.sourceText.trim()) return 1;
    if (successfulOutputs.length === 0) return 2;
    if (!hasSavedCurrentResult) return 3;
    return 4;
  }, [form.sourceText, hasSavedCurrentResult, successfulOutputs.length]);

  const brandOptions = useMemo(() => {
    const brands = new Set(
      savedResults
        .map((item) => item.brand_name.trim())
        .filter(Boolean)
    );

    return Array.from(brands).sort((a, b) => a.localeCompare(b, "ko"));
  }, [savedResults]);

  const filteredResults = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const tagQuery = filters.tag.trim().toLowerCase();

    const nextResults = savedResults.filter((item) => {
      if (filters.workType !== "all" && item.work_type !== filters.workType) {
        return false;
      }

      if (filters.status !== "all" && item.status !== filters.status) {
        return false;
      }

      if (filters.brand.trim()) {
        const sameBrand =
          item.brand_name.toLowerCase() === filters.brand.trim().toLowerCase();

        if (!sameBrand) {
          return false;
        }
      }

      if (tagQuery) {
        const tagText = (item.tags ?? []).join(",").toLowerCase();

        if (!tagText.includes(tagQuery)) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const haystack = [
        item.title ?? "",
        item.project_name,
        item.brand_name,
        item.source_text,
        getPreferredResultText(item),
        (item.tags ?? []).join(",")
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    nextResults.sort((left, right) => {
      const leftTime = new Date(left.created_at).getTime();
      const rightTime = new Date(right.created_at).getTime();

      return filters.sort === "latest"
        ? rightTime - leftTime
        : leftTime - rightTime;
    });

    return nextResults;
  }, [filters, savedResults]);

  useEffect(() => {
    void fetchSavedResults();
  }, []);

  useEffect(() => {
    if (!selectedResult) {
      setDetailTitle("");
      setDetailStatus("초안");
      setDetailTagsInput("");
      return;
    }

    setDetailTitle(getDisplayTitle(selectedResult));
    setDetailStatus(selectedResult.status ?? "초안");
    setDetailTagsInput((selectedResult.tags ?? []).join(", "));
  }, [selectedResult]);

  const updateField = <K extends keyof MarketingFormState>(
    field: K,
    value: MarketingFormState[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateFilter = <K extends keyof SearchFilters>(
    field: K,
    value: SearchFilters[K]
  ) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const fetchSavedResults = async () => {
    const response = await fetch("/api/results");
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "저장 결과 목록을 불러오지 못했습니다.");
      return;
    }

    setSavedResults((payload.results ?? []) as SavedResult[]);
  };

  const handleGenerate = async (
    payload: Partial<MarketingFormState> & {
      workType: WorkType;
      sourceText: string;
      tone: ToneOption;
      transformAction?: TransformActionId | null;
      attachments?: Attachment[];
    }
  ) => {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "AI 결과 생성에 실패했습니다.");
    }

    const nextOutputs = (data.outputs ?? []) as AiOutput[];
    const firstSuccess = nextOutputs.find(
      (output) => output.status === "success" && output.result
    );

    setOutputs(nextOutputs);
    setActiveProvider(firstSuccess?.provider ?? "openai");
    return nextOutputs;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSelectedResult(null);
    setHasSavedCurrentResult(false);
    setIsLoading(true);

    try {
      await handleGenerate({
        ...form,
        attachments,
        transformAction: null
      });
      setNotice("AI 결과가 생성되었습니다. 저장하거나 다른 형식으로 변환할 수 있습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "AI 결과 생성 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    const resultText = activeOutput?.result;

    if (!resultText) return;

    await navigator.clipboard.writeText(resultText);
    setCopyState("복사 완료");
    setNotice("AI 결과가 클립보드에 복사되었습니다.");
    window.setTimeout(() => setCopyState("복사하기"), 1400);
  };

  const handleReset = () => {
    setForm(initialFormState);
    setOutputs([]);
    setAttachments([]);
    setSelectedResult(null);
    setError("");
    setNotice("");
    setCopyState("복사하기");
    setHasSavedCurrentResult(false);
  };

  const handleAttachmentUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) return;

    setIsUploadingAttachment(true);
    setError("");

    try {
      const uploadedAttachments: Attachment[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/attachments", {
          method: "POST",
          body: formData
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "첨부파일 업로드에 실패했습니다.");
        }

        uploadedAttachments.push(payload.attachment as Attachment);
      }

      setAttachments((current) => [...current, ...uploadedAttachments]);
      setNotice("첨부파일이 업로드되었습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "첨부파일 업로드 중 오류가 발생했습니다."
      );
    } finally {
      setIsUploadingAttachment(false);
      event.target.value = "";
    }
  };

  const handleRemoveAttachment = async (attachment: Attachment) => {
    setAttachments((current) =>
      current.filter((item) => item.path !== attachment.path)
    );

    if (!selectedResult) {
      await fetch("/api/attachments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ path: attachment.path })
      }).catch(() => undefined);
    }
  };

  const getCurrentContext = () => {
    if (selectedResult) {
      return {
        projectName: selectedResult.project_name ?? "",
        brandName: selectedResult.brand_name ?? "",
        workType: selectedResult.work_type,
        tone: (selectedResult.tone as ToneOption) ?? "기본",
        target: selectedResult.target ?? "",
        objective: selectedResult.objective ?? "",
        keyMessage: selectedResult.key_message ?? "",
        requiredPoints: selectedResult.required_points ?? "",
        excludedPoints: selectedResult.excluded_points ?? "",
        referenceText: selectedResult.reference_text ?? "",
        sourceText: selectedResult.source_text ?? "",
        attachments: selectedResult.attachments ?? []
      };
    }

    return {
      ...form,
      attachments
    };
  };

  const handleSave = async () => {
    if (successfulOutputs.length === 0) return;

    const context = getCurrentContext();
    setIsSaving(true);
    setError("");
    setNotice("");

    const response = await fetch("/api/results", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: selectedResult ? detailTitle : undefined,
        projectName: context.projectName,
        brandName: context.brandName,
        workType: context.workType,
        tone: context.tone,
        target: context.target,
        objective: context.objective,
        keyMessage: context.keyMessage,
        requiredPoints: context.requiredPoints,
        excludedPoints: context.excludedPoints,
        referenceText: context.referenceText,
        sourceText: context.sourceText,
        resultText: activeOutput?.result ?? successfulOutputs[0].result,
        primaryResult: activeOutput?.result ?? successfulOutputs[0].result,
        status: selectedResult?.status ?? "초안",
        tags: selectedResult?.tags ?? [],
        outputs,
        attachments: context.attachments ?? attachments
      })
    });

    setIsSaving(false);

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "결과 저장에 실패했습니다.");
      return;
    }

    const savedItem = payload.result as SavedResult;
    setSelectedResult(savedItem);
    setHasSavedCurrentResult(true);
    setNotice("저장 결과가 업데이트되었습니다.");
    await fetchSavedResults();
  };

  const handleSelectSavedResult = (item: SavedResult) => {
    const restoredOutputs = normalizeSavedOutputs(item);
    const firstSuccess = restoredOutputs.find(
      (output) => output.status === "success" && output.result
    );

    setOutputs(restoredOutputs);
    setActiveProvider(firstSuccess?.provider ?? "openai");
    setAttachments(item.attachments ?? []);
    setSelectedResult(item);
    setError("");
    setNotice(`${getDisplayTitle(item)}를 불러왔습니다.`);
    setCopyState("복사하기");
  };

  const handleDeleteResult = async (id: string) => {
    const confirmed = window.confirm("이 저장 결과를 삭제할까요?");

    if (!confirmed) return;

    setError("");
    setNotice("");

    const response = await fetch(`/api/results/${id}`, {
      method: "DELETE"
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "저장 결과 삭제에 실패했습니다.");
      return;
    }

    if (selectedResult?.id === id) {
      setSelectedResult(null);
      setOutputs([]);
      setActiveProvider("openai");
      setCopyState("복사하기");
    }

    setNotice("저장 결과가 삭제되었습니다.");
    await fetchSavedResults();
  };

  const handleUpdateSelectedResult = async () => {
    if (!selectedResult) return;

    setIsUpdatingDetail(true);
    setError("");
    setNotice("");

    const response = await fetch(`/api/results/${selectedResult.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: detailTitle,
        status: detailStatus,
        tags: detailTagsInput
      })
    });

    setIsUpdatingDetail(false);
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "상세 정보 저장에 실패했습니다.");
      return;
    }

    const updatedItem = payload.result as SavedResult;
    setSelectedResult(updatedItem);
    setNotice("상태와 태그가 저장되었습니다.");
    await fetchSavedResults();
  };

  const handleRegenerate = async () => {
    const context = getCurrentContext();

    if (!context.sourceText.trim()) {
      setError("다시 생성할 원문 입력이 없습니다.");
      return;
    }

    setIsTransforming(true);
    setError("");
    setNotice("");
    setSelectedResult(null);
    setHasSavedCurrentResult(false);

    try {
      await handleGenerate({
        ...context,
        transformAction: null
      });
      setNotice("현재 입력 기준으로 결과를 다시 생성했습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "다시 생성 중 오류가 발생했습니다."
      );
    } finally {
      setIsTransforming(false);
    }
  };

  const handleTransform = async (action: TransformActionId) => {
    const context = getCurrentContext();
    const baseResultText =
      activeOutput?.result || getSavedResultDisplayText(selectedResult ?? {});

    if (!baseResultText.trim()) {
      setError("변환할 결과 텍스트가 없습니다.");
      return;
    }

    const mapped = mapTransformToPayload(action);
    setIsTransforming(true);
    setError("");
    setNotice("");
    setSelectedResult(null);
    setHasSavedCurrentResult(false);

    try {
      updateField("workType", mapped.workType);
      updateField("tone", mapped.tone);
      updateField("requiredPoints", mapped.requiredPoints);
      updateField("sourceText", baseResultText);

      await handleGenerate({
        ...context,
        workType: mapped.workType,
        tone: mapped.tone,
        requiredPoints: mapped.requiredPoints,
        sourceText: baseResultText,
        attachments: context.attachments ?? [],
        transformAction: action
      });
      setNotice("결과를 다른 업무 형식으로 변환했습니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "결과 변환 중 오류가 발생했습니다."
      );
    } finally {
      setIsTransforming(false);
    }
  };

  return (
    <main className="min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[300px_minmax(520px,1fr)_520px]">
        <aside className="border-b border-line bg-ink px-6 py-7 text-white lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-lg font-bold">
              M
            </div>
            <div>
              <p className="text-sm text-white/60">AI 업무 정리 툴</p>
              <h1 className="text-xl font-semibold">Marketing Desk</h1>
            </div>
          </div>

          <nav className="mt-10 space-y-2">
            {workTypeOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => updateField("workType", item.value)}
                className={`w-full rounded-md px-4 py-3 text-left transition ${
                  form.workType === item.value
                    ? "bg-white text-ink shadow-panel"
                    : "text-white/78 hover:bg-white/10"
                }`}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span
                  className={`mt-1 block text-xs ${
                    form.workType === item.value ? "text-muted" : "text-white/48"
                  }`}
                >
                  {item.description}
                </span>
              </button>
            ))}
          </nav>

          <section className="mt-10 rounded-md border border-white/10 bg-white/8 p-4">
            <p className="text-sm font-semibold">팀 공용 작업공간</p>
            <p className="mt-2 text-sm leading-6 text-white/66">
              같은 주소를 쓰는 팀원이 결과를 생성하고, 상태와 태그를 붙여 다시 활용할 수 있습니다.
            </p>
          </section>
        </aside>

        <section className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-accent">Workspace</p>
              <h2 className="mt-1 text-2xl font-semibold text-ink">
                마케팅 실무 입력
              </h2>
            </div>
            <div className="rounded-md border border-line bg-panel px-4 py-2 text-sm text-muted">
              {selectedWorkType.label}
            </div>
          </div>

          <div className="mb-7 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {workflowSteps.map((step, index) => (
              <div
                key={step}
                className={`rounded-md border px-3 py-3 ${
                  index <= currentStep
                    ? "border-teal-200 bg-teal-50 text-teal-900"
                    : "border-line bg-white text-muted"
                }`}
              >
                <span className="block text-xs font-semibold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-1 block text-sm font-semibold">{step}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-ink">프로젝트명</span>
                <input
                  value={form.projectName}
                  onChange={(event) =>
                    updateField("projectName", event.target.value)
                  }
                  placeholder="예: 6월 리텐션 캠페인"
                  className="mt-2 h-12 w-full rounded-md border border-line bg-white px-4 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-ink">브랜드명</span>
                <input
                  value={form.brandName}
                  onChange={(event) =>
                    updateField("brandName", event.target.value)
                  }
                  placeholder="예: 브랜드 A"
                  className="mt-2 h-12 w-full rounded-md border border-line bg-white px-4 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-ink">업무 유형</span>
                <select
                  value={form.workType}
                  onChange={(event) =>
                    updateField("workType", event.target.value as WorkType)
                  }
                  className="mt-2 h-12 w-full rounded-md border border-line bg-white px-4 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                >
                  {workTypeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-ink">톤앤매너</span>
                <select
                  value={form.tone}
                  onChange={(event) =>
                    updateField("tone", event.target.value as ToneOption)
                  }
                  className="mt-2 h-12 w-full rounded-md border border-line bg-white px-4 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                >
                  {toneOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-ink">타깃</span>
                <input
                  value={form.target}
                  onChange={(event) => updateField("target", event.target.value)}
                  placeholder="예: 25-34세 직장인 여성"
                  className="mt-2 h-12 w-full rounded-md border border-line bg-white px-4 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-ink">목표</span>
                <input
                  value={form.objective}
                  onChange={(event) =>
                    updateField("objective", event.target.value)
                  }
                  placeholder="예: 체험 신청 전환 확대"
                  className="mt-2 h-12 w-full rounded-md border border-line bg-white px-4 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-ink">핵심 메시지</span>
              <textarea
                value={form.keyMessage}
                onChange={(event) =>
                  updateField("keyMessage", event.target.value)
                }
                rows={3}
                placeholder="꼭 전달해야 할 메시지를 적어 주세요."
                className="mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-ink">필수 포함 내용</span>
                <textarea
                  value={form.requiredPoints}
                  onChange={(event) =>
                    updateField("requiredPoints", event.target.value)
                  }
                  rows={4}
                  placeholder="반드시 들어가야 할 포인트를 적어 주세요."
                  className="mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-ink">제외할 내용</span>
                <textarea
                  value={form.excludedPoints}
                  onChange={(event) =>
                    updateField("excludedPoints", event.target.value)
                  }
                  rows={4}
                  placeholder="빼고 싶은 표현이나 제한사항을 적어 주세요."
                  className="mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-ink">참고 레퍼런스</span>
              <textarea
                value={form.referenceText}
                onChange={(event) =>
                  updateField("referenceText", event.target.value)
                }
                rows={4}
                placeholder="비슷한 사례, 링크 요약, 참고 문구 등을 적어 주세요."
                className="mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
            </label>

            <section
              id="reference-attachments"
              data-testid="reference-attachments"
              className="rounded-md border border-line bg-white p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-ink">레퍼런스 첨부</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    이미지, 캡처본, PDF, PPT 등 AI가 참고할 자료를 첨부해 주세요.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Supabase Storage에 marketing-attachments 버킷이 필요합니다.
                  </p>
                </div>
                <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-slate-700">
                  {isUploadingAttachment ? "업로드 중" : "파일 선택"}
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.pptx,.docx,.xlsx,image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleAttachmentUpload}
                    disabled={isUploadingAttachment}
                    className="sr-only"
                  />
                </label>
              </div>

              {attachments.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.path}
                      className="flex items-center gap-3 rounded-md border border-line bg-slate-50 px-3 py-3"
                    >
                      {isImageAttachment(attachment) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="h-12 w-12 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-white text-xs font-semibold text-muted">
                          FILE
                        </div>
                      )}
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1"
                      >
                        <span className="block truncate text-sm font-semibold text-ink">
                          {attachment.name}
                        </span>
                        <span className="mt-1 block truncate text-xs text-muted">
                          {attachment.type || "unknown"} ·{" "}
                          {formatFileSize(attachment.size)}
                        </span>
                      </a>
                      <button
                        type="button"
                        onClick={() => void handleRemoveAttachment(attachment)}
                        className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <label className="block">
              <span className="text-sm font-semibold text-ink">원문 입력</span>
              <textarea
                value={form.sourceText}
                onChange={(event) => updateField("sourceText", event.target.value)}
                required
                minLength={10}
                rows={10}
                placeholder="브리프, 회의록, 광고 성과, 운영 메모 등 원문을 붙여넣어 주세요."
                className="mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
            </label>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {notice ? (
              <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                {notice}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isBusy}
                className="h-12 rounded-md bg-accent px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-muted"
              >
                {isLoading ? "생성 중" : "AI 결과 생성"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isBusy || isSaving}
                className="h-12 rounded-md border border-line bg-white px-5 text-sm font-semibold text-ink transition hover:border-muted disabled:cursor-not-allowed disabled:text-muted"
              >
                초기화
              </button>
            </div>
          </form>
        </section>

        <aside className="border-t border-line bg-panel px-5 py-6 sm:px-8 lg:border-l lg:border-t-0 lg:px-7 lg:py-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-signal">Output</p>
              <h2 className="mt-1 text-xl font-semibold text-ink">AI 결과 및 저장 상세</h2>
            </div>
            <div className="text-xs text-muted">
              {selectedResult ? "저장 결과 상세 보기" : "현재 생성 결과"}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!activeOutput?.result}
              className="h-10 rounded-md border border-line px-4 text-sm font-semibold text-ink transition hover:border-muted disabled:cursor-not-allowed disabled:text-muted"
            >
              {copyState}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={successfulOutputs.length === 0 || isSaving || isBusy}
              className="h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-muted"
            >
              {isSaving ? "저장 중" : "저장하기"}
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isBusy}
              className="h-10 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-muted disabled:cursor-not-allowed disabled:text-muted"
            >
              {isTransforming ? "변환 중" : "다시 생성"}
            </button>
            {transformActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => void handleTransform(action.id)}
                disabled={isBusy || !activeOutput?.result}
                className="h-10 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-muted disabled:cursor-not-allowed disabled:text-muted"
              >
                {action.label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            {(["openai", "claude"] as const).map((provider) => {
              const output = outputs.find((item) => item.provider === provider);
              const label = provider === "openai" ? "OpenAI" : "Claude";

              return (
                <button
                  key={provider}
                  type="button"
                  onClick={() => setActiveProvider(provider)}
                  className={`h-10 rounded-md px-4 text-sm font-semibold ${
                    activeProvider === provider
                      ? "bg-accent text-white"
                      : "border border-line bg-white text-ink"
                  }`}
                >
                  {label}
                  {output?.status === "error" ? " 오류" : ""}
                  {output?.status === "skipped" ? " 미설정" : ""}
                </button>
              );
            })}
          </div>

          <div className="mt-4 min-h-[320px] rounded-md border border-line bg-slate-50 p-5">
            {isBusy ? (
              <div className="space-y-3">
                <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
              </div>
            ) : activeOutput?.result ? (
              <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-ink">
                {activeOutput.result}
              </pre>
            ) : activeOutput?.error ? (
              <p className="text-sm leading-6 text-red-700">
                {activeOutput.error}
              </p>
            ) : (
              <div className="flex min-h-[270px] items-center justify-center text-center">
                <p className="max-w-xs text-sm leading-6 text-muted">
                  원문을 입력해 결과를 생성하거나 저장된 결과를 선택하면 여기에 표시됩니다.
                </p>
              </div>
            )}
          </div>

          {selectedResult ? (
            <section className="mt-6 rounded-md border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">저장 결과 상세</h3>
                <button
                  type="button"
                  onClick={() => void handleDeleteResult(selectedResult.id)}
                  className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  삭제하기
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-muted">제목</span>
                  <input
                    value={detailTitle}
                    onChange={(event) => setDetailTitle(event.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-muted">상태</span>
                    <select
                      value={detailStatus}
                      onChange={(event) =>
                        setDetailStatus(event.target.value as ResultStatus)
                      }
                      className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                    >
                      {resultStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-muted">태그</span>
                    <input
                      value={detailTagsInput}
                      onChange={(event) => setDetailTagsInput(event.target.value)}
                      placeholder="예: 이벤트, 릴스, 광고주공유"
                      className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => void handleUpdateSelectedResult()}
                  disabled={isUpdatingDetail}
                  className="h-10 rounded-md bg-accent px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-muted"
                >
                  {isUpdatingDetail ? "저장 중" : "상태/태그 저장"}
                </button>

                <div className="grid gap-3 text-sm text-ink">
                  <div>
                    <p className="text-xs font-semibold text-muted">프로젝트명</p>
                    <p className="mt-1">{selectedResult.project_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted">브랜드명</p>
                    <p className="mt-1">{selectedResult.brand_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted">업무 유형</p>
                    <p className="mt-1">{getWorkTypeLabel(selectedResult.work_type)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted">톤앤매너</p>
                    <p className="mt-1">{selectedResult.tone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted">타깃</p>
                    <p className="mt-1 whitespace-pre-wrap">{selectedResult.target || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted">목표</p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {selectedResult.objective || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted">핵심 메시지</p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {selectedResult.key_message || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted">필수 포함 내용</p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {selectedResult.required_points || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted">제외할 내용</p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {selectedResult.excluded_points || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted">참고 레퍼런스</p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {selectedResult.reference_text || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted">원문 입력</p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {selectedResult.source_text || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted">
                      레퍼런스 첨부
                    </p>
                    {selectedResult.attachments?.length ? (
                      <div className="mt-2 space-y-2">
                        {selectedResult.attachments.map((attachment) => (
                          <a
                            key={attachment.path}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-md border border-line bg-slate-50 px-3 py-3"
                          >
                            {isImageAttachment(attachment) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="h-10 w-10 shrink-0 rounded object-cover"
                              />
                            ) : (
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white text-xs font-semibold text-muted">
                                FILE
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-ink">
                                {attachment.name}
                              </span>
                              <span className="mt-1 block truncate text-xs text-muted">
                                {attachment.type || "unknown"} ·{" "}
                                {formatFileSize(attachment.size)}
                              </span>
                            </span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1">-</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">저장된 결과</h3>
              <button
                type="button"
                onClick={() => void fetchSavedResults()}
                className="text-xs font-semibold text-accent"
              >
                새로고침
              </button>
            </div>

            <div className="mt-3 grid gap-3 rounded-md border border-line bg-white p-3">
              <input
                value={filters.query}
                onChange={(event) => updateFilter("query", event.target.value)}
                placeholder="프로젝트명, 브랜드명, 제목, 원문, 결과 내용 검색"
                className="h-11 rounded-md border border-line px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              />

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={filters.workType}
                  onChange={(event) =>
                    updateFilter("workType", event.target.value as SearchFilters["workType"])
                  }
                  className="h-11 rounded-md border border-line px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                >
                  <option value="all">업무 유형 전체</option>
                  {workTypeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.status}
                  onChange={(event) =>
                    updateFilter("status", event.target.value as SearchFilters["status"])
                  }
                  className="h-11 rounded-md border border-line px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                >
                  <option value="all">상태 전체</option>
                  {resultStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <select
                  value={filters.brand}
                  onChange={(event) => updateFilter("brand", event.target.value)}
                  className="h-11 rounded-md border border-line px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                >
                  <option value="">브랜드 전체</option>
                  {brandOptions.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>

                <input
                  value={filters.tag}
                  onChange={(event) => updateFilter("tag", event.target.value)}
                  placeholder="태그 검색"
                  className="h-11 rounded-md border border-line px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                />

                <select
                  value={filters.sort}
                  onChange={(event) =>
                    updateFilter("sort", event.target.value as SearchFilters["sort"])
                  }
                  className="h-11 rounded-md border border-line px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                >
                  <option value="latest">최신순</option>
                  <option value="oldest">오래된순</option>
                </select>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {savedResults.length === 0 ? (
                <p className="rounded-md border border-line bg-white px-3 py-3 text-sm text-muted">
                  저장된 결과가 없습니다.
                </p>
              ) : filteredResults.length === 0 ? (
                <p className="rounded-md border border-line bg-white px-3 py-3 text-sm text-muted">
                  조건에 맞는 저장 결과가 없습니다.
                </p>
              ) : (
                filteredResults.map((item) => {
                  const isActive = selectedResult?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectSavedResult(item)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") {
                          return;
                        }

                        event.preventDefault();
                        handleSelectSavedResult(item);
                      }}
                      className={`w-full rounded-md border px-3 py-3 text-left transition ${
                        isActive
                          ? "border-accent bg-teal-50 shadow-panel"
                          : "border-line bg-white hover:border-accent/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">
                            {getDisplayTitle(item)}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted">
                            {item.brand_name || "브랜드 미지정"}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded border border-teal-200 bg-teal-50 px-2 py-1 font-semibold text-teal-800">
                              {getWorkTypeLabel(item.work_type)}
                            </span>
                            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-700">
                              {item.status ?? "초안"}
                            </span>
                            {(item.tags ?? []).map((tag) => (
                              <span
                                key={`${item.id}-${tag}`}
                                className="rounded border border-line bg-white px-2 py-1 text-slate-600"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                            <span>생성 {formatDate(item.created_at)}</span>
                            <span>수정 {formatDate(item.updated_at)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteResult(item.id);
                          }}
                          className="shrink-0 rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
