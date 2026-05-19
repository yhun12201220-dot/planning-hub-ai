"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type WorkType = "brief" | "proposal" | "sns" | "minutes" | "report";
type Provider = "openai" | "claude";

type FormState = {
  projectName: string;
  brandName: string;
  workType: WorkType;
  sourceText: string;
};

type AiOutput = {
  provider: Provider;
  label: string;
  result: string;
  status: "success" | "skipped" | "error";
  error?: string;
};

type SavedResult = {
  id: string;
  project_name: string;
  brand_name: string;
  work_type: WorkType;
  primary_result: string;
  outputs: AiOutput[] | null;
  created_at: string;
};

const workTypes: Array<{
  id: WorkType;
  label: string;
  description: string;
}> = [
  {
    id: "brief",
    label: "브리프 정리",
    description: "요구사항, 타깃, 핵심 메시지를 정리"
  },
  {
    id: "proposal",
    label: "기획안 생성",
    description: "캠페인 방향과 실행안을 구조화"
  },
  {
    id: "sns",
    label: "SNS 멘션 생성",
    description: "채널에 맞는 게시글 초안 작성"
  },
  {
    id: "minutes",
    label: "회의록 정리",
    description: "논의 내용과 액션 아이템 추출"
  },
  {
    id: "report",
    label: "보고서 인사이트 생성",
    description: "성과 데이터에서 시사점 도출"
  }
];

const initialForm: FormState = {
  projectName: "",
  brandName: "",
  workType: "brief",
  sourceText: ""
};

const workflowSteps = [
  "업무 유형 선택",
  "브리프 입력",
  "AI 생성",
  "결과 저장",
  "최근 결과 표시"
];

const getWorkTypeLabel = (workType: WorkType) =>
  workTypes.find((item) => item.id === workType)?.label ?? workType;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

const normalizeSavedOutputs = (item: SavedResult): AiOutput[] => {
  if (Array.isArray(item.outputs) && item.outputs.length > 0) {
    return item.outputs;
  }

  return [
    {
      provider: "openai",
      label: "Saved",
      result: item.primary_result,
      status: "success"
    }
  ];
};

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [outputs, setOutputs] = useState<AiOutput[]>([]);
  const [activeProvider, setActiveProvider] = useState<Provider>("openai");
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copyState, setCopyState] = useState("복사");
  const [hasSavedCurrentResult, setHasSavedCurrentResult] = useState(false);

  const selectedWorkType = useMemo(
    () => workTypes.find((item) => item.id === form.workType) ?? workTypes[0],
    [form.workType]
  );

  const activeOutput =
    outputs.find((output) => output.provider === activeProvider) ?? outputs[0];

  const successfulOutputs = outputs.filter(
    (output) => output.status === "success" && output.result
  );

  const currentStep = useMemo(() => {
    if (!form.workType) return 0;
    if (!form.projectName || !form.brandName || form.sourceText.length < 10) {
      return 1;
    }
    if (successfulOutputs.length === 0) return 2;
    if (!hasSavedCurrentResult) return 3;
    return 4;
  }, [
    form.brandName,
    form.projectName,
    form.sourceText.length,
    form.workType,
    hasSavedCurrentResult,
    successfulOutputs.length
  ]);

  useEffect(() => {
    void loadSavedResults();
  }, []);

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const loadSavedResults = async () => {
    const response = await fetch("/api/results");
    const payload = await response.json();

    if (!response.ok) {
      setNotice("저장 목록을 불러오지 못했습니다.");
      return;
    }

    setSavedResults((payload.results ?? []) as SavedResult[]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setOutputs([]);
    setSelectedSavedId(null);
    setHasSavedCurrentResult(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "결과 생성에 실패했습니다.");
      }

      const nextOutputs = (payload.outputs ?? []) as AiOutput[];
      setOutputs(nextOutputs);
      const firstSuccess = nextOutputs.find(
        (output) => output.status === "success"
      );
      setActiveProvider(firstSuccess?.provider ?? "openai");
      setNotice("AI 결과가 생성되었습니다. 확인 후 저장하면 최근 결과에 표시됩니다.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!activeOutput?.result) return;

    await navigator.clipboard.writeText(activeOutput.result);
    setCopyState("복사됨");
    window.setTimeout(() => setCopyState("복사"), 1400);
  };

  const handleReset = () => {
    setForm(initialForm);
    setOutputs([]);
    setSelectedSavedId(null);
    setError("");
    setNotice("");
    setCopyState("복사");
    setHasSavedCurrentResult(false);
  };

  const handleSave = async () => {
    if (successfulOutputs.length === 0) return;

    setIsSaving(true);
    setError("");
    setNotice("");

    const response = await fetch("/api/results", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        projectName: form.projectName,
        brandName: form.brandName,
        workType: form.workType,
        sourceText: form.sourceText,
        outputs,
        primaryResult: activeOutput?.result ?? successfulOutputs[0].result
      })
    });

    setIsSaving(false);

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "결과 저장에 실패했습니다.");
      return;
    }

    setNotice("결과물이 저장되었습니다.");
    setHasSavedCurrentResult(true);
    await loadSavedResults();

    if (payload.result?.id) {
      setSelectedSavedId(payload.result.id);
    }
  };

  const handleSelectSavedResult = (item: SavedResult) => {
    const restoredOutputs = normalizeSavedOutputs(item);
    const firstSuccess = restoredOutputs.find(
      (output) => output.status === "success" && output.result
    );

    setOutputs(restoredOutputs);
    setActiveProvider(firstSuccess?.provider ?? restoredOutputs[0]?.provider ?? "openai");
    setSelectedSavedId(item.id);
    setNotice(`${item.project_name} 저장 결과를 불러왔습니다.`);
    setError("");
    setCopyState("복사");
  };

  return (
    <main className="min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_minmax(420px,1fr)_440px]">
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
            {workTypes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => updateField("workType", item.id)}
                className={`w-full rounded-md px-4 py-3 text-left transition ${
                  form.workType === item.id
                    ? "bg-white text-ink shadow-panel"
                    : "text-white/78 hover:bg-white/10"
                }`}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span
                  className={`mt-1 block text-xs ${
                    form.workType === item.id ? "text-muted" : "text-white/48"
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
              별도 계정 없이 같은 주소를 쓰는 팀원이 결과를 생성하고 최근 저장본을 함께 확인합니다.
            </p>
          </section>
        </aside>

        <section className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-accent">Workspace</p>
              <h2 className="mt-1 text-2xl font-semibold text-ink">
                마케팅 기획 업무 생성
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
                  required
                  placeholder="예: 2026 봄 캠페인"
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
                  required
                  placeholder="예: 브랜드 A"
                  className="mt-2 h-12 w-full rounded-md border border-line bg-white px-4 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-ink">업무 유형</span>
              <select
                value={form.workType}
                onChange={(event) =>
                  updateField("workType", event.target.value as WorkType)
                }
                className="mt-2 h-12 w-full rounded-md border border-line bg-white px-4 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              >
                {workTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-ink">원문 입력</span>
              <textarea
                value={form.sourceText}
                onChange={(event) => updateField("sourceText", event.target.value)}
                required
                minLength={10}
                rows={14}
                placeholder="광고주 브리프, 회의록, SNS 콘텐츠 정보, 광고 성과 데이터 등을 붙여넣어 주세요."
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
                disabled={isLoading}
                className="h-12 rounded-md bg-accent px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-muted"
              >
                {isLoading ? "생성 중" : "AI 결과 생성"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-12 rounded-md border border-line bg-white px-5 text-sm font-semibold text-ink transition hover:border-muted"
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
              <h2 className="mt-1 text-xl font-semibold text-ink">AI 결과</h2>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={successfulOutputs.length === 0 || isSaving}
                className="h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-muted"
              >
                {isSaving ? "저장 중" : "저장"}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!activeOutput?.result}
                className="h-10 rounded-md border border-line px-4 text-sm font-semibold text-ink transition hover:border-muted disabled:cursor-not-allowed disabled:text-muted"
              >
                {copyState}
              </button>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            {(["openai", "claude"] as Provider[]).map((provider) => {
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

          <div className="mt-4 min-h-[420px] rounded-md border border-line bg-slate-50 p-5">
            {isLoading ? (
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
              <div className="flex min-h-[370px] items-center justify-center text-center">
                <p className="max-w-xs text-sm leading-6 text-muted">
                  원문을 입력하거나 저장된 결과를 선택하면 여기에 결과가 표시됩니다.
                </p>
              </div>
            )}
          </div>

          <section className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">저장된 결과</h3>
              <button
                type="button"
                onClick={loadSavedResults}
                className="text-xs font-semibold text-accent"
              >
                새로고침
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {savedResults.length > 0 ? (
                savedResults.map((item) => {
                  const isActive = item.id === selectedSavedId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSavedResult(item)}
                      className={`w-full rounded-md border px-3 py-3 text-left transition ${
                        isActive
                          ? "border-accent bg-teal-50 shadow-panel"
                          : "border-line bg-white hover:border-accent/50"
                      }`}
                    >
                      <span className="block truncate text-sm font-semibold text-ink">
                        {item.project_name}
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-3 text-xs text-muted">
                        <span>{getWorkTypeLabel(item.work_type)}</span>
                        <span>{formatDate(item.created_at)}</span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="rounded-md border border-line bg-white px-3 py-3 text-sm text-muted">
                  저장하면 팀의 최근 결과가 여기에 표시됩니다.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
