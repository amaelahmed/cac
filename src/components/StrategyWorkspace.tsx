"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpenText,
  BrainCircuit,
  CalendarDays,
  FileText,
  Lightbulb,
  Megaphone,
  MessageSquareText,
  PackageCheck,
  PenLine,
  Search,
  Sparkles,
  Target,
  UsersRound,
  WalletCards,
} from "lucide-react";

type StrategyValue =
  | string
  | number
  | boolean
  | null
  | StrategyValue[]
  | { [key: string]: StrategyValue };
type StrategyRecord = Record<string, StrategyValue>;

type WorkspaceResult = {
  strategy?: StrategyRecord;
  confidence?: {
    score: number;
    status: string;
    reasoning?: string[];
  };
  telemetry?: {
    ai_calls_count?: number;
    knowledge_objects_used?: number;
    fallback_used?: boolean;
    generation_source?: string;
    modules_generated?: number;
    report_schema_valid?: boolean;
  };
  generatedAt?: string;
  savedReportId?: string;
};

type WorkspacePayload = {
  biz_name?: string;
  biz_industry?: string;
  biz_location?: string;
  biz_customer_model?: string;
  biz_offer?: string;
  biz_ticket?: string;
  biz_budget?: string;
  platforms?: string[];
};

type StrategyWorkspaceProps = {
  result: WorkspaceResult;
  payload: WorkspacePayload | null;
  onBack: () => void;
  onPrint: () => void;
};

const tabDefs = [
  { id: "calendar", label: "Calendar / 30-Day Post Plan", icon: CalendarDays },
  { id: "strategy", label: "Marketing Plan", icon: Target },
  { id: "psychology", label: "What Customers Think", icon: BrainCircuit },
  { id: "clientPersona", label: "Example Customer Types", icon: UsersRound },
  { id: "painPoints", label: "Customer Problems", icon: Megaphone },
  {
    id: "competitors",
    label: "Other Shops Customers May Choose",
    icon: Search,
  },
  { id: "ideas", label: "Post Ideas", icon: Lightbulb },
  { id: "captions", label: "Ready-to-Use Captions", icon: PenLine },
  { id: "templates", label: "Message Templates", icon: MessageSquareText },
  { id: "brandKit", label: "Brand Style", icon: PackageCheck },
  { id: "roiTool", label: "Ad Result Calculator", icon: BarChart3 },
  { id: "premiumGrowth", label: "Advanced Growth Plan", icon: WalletCards },
  { id: "fullReport", label: "Full Plan", icon: BookOpenText },
] as const;

type WorkspaceTabId = (typeof tabDefs)[number]["id"];

function isRecord(value: StrategyValue | unknown): value is StrategyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: StrategyValue | unknown): StrategyRecord {
  return isRecord(value) ? value : {};
}

function asArray(value: StrategyValue | unknown): StrategyValue[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value as StrategyValue];
}

function asText(value: StrategyValue | unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value
      .map((item) => asText(item))
      .filter(Boolean)
      .join(" ");
  if (isRecord(value))
    return Object.values(value)
      .map((item) => asText(item))
      .filter(Boolean)
      .join(" ");
  return fallback;
}

function parseTicket(value: string | undefined) {
  const ticket = String(value || "");
  if (ticket.includes("50,000")) return 50000;
  if (ticket.includes("10,000")) return 10000;
  if (ticket.includes("2,000")) return 2000;
  if (ticket.includes("500")) return 500;
  if (ticket.includes("200")) return 200;
  return 1000;
}

function money(value: number) {
  return `₹${Math.max(0, Math.round(value)).toLocaleString("en-IN")}`;
}

function isDigitalContext(
  report: StrategyRecord,
  payload: WorkspacePayload | null,
) {
  const business = asRecord(report.business);
  const text = [
    payload?.biz_industry,
    payload?.biz_location,
    payload?.biz_customer_model,
    payload?.biz_offer,
    asText(business.category),
    asText(business.location),
    asText(business.operating_model),
    asText(report["Business DNA / Profile"]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /software|saas|\bapp\b|\bai\b|online tool|digital product|developer|vibe/.test(
    text,
  );
}

function isLeadServiceContext(
  report: StrategyRecord,
  payload: WorkspacePayload | null,
) {
  const business = asRecord(report.business);
  const text = [
    payload?.biz_industry,
    payload?.biz_customer_model,
    payload?.biz_offer,
    asText(business.category),
    asText(business.operating_model),
    asText(report["Business DNA / Profile"]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    /agency|consult|consulting|coaching|studio|professional service|freelancer|marketing|design|development|strategy/.test(
      text,
    ) &&
    !/home visit|customer location|clinic|doctor|dental|salon|beauty|barber|spa|repair|cleaning|laundry|restaurant|cafe|shop|store/.test(
      text,
    )
  );
}

function isEducationContext(
  report: StrategyRecord,
  payload: WorkspacePayload | null,
) {
  const business = asRecord(report.business);
  const text = [
    payload?.biz_industry,
    payload?.biz_customer_model,
    payload?.biz_offer,
    asText(business.category),
    asText(business.tag),
    asText(business.positioning_summary),
    asText(report["Business DNA / Profile"]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /education|tuition|school|academy|offline classes|online course|coaching program|workshop|student|parent/.test(
    text,
  );
}

function fallbackTabs(report: StrategyRecord) {
  return {
    calendar: { days: asArray(report["30-Day Content Calendar"]) },
    strategy: { steps: asArray(report["10-Step Growth Strategy"]) },
    psychology: report["Customer Psychology"] || {},
    clientPersona: { personas: [] },
    painPoints: {
      items: asArray(asRecord(report["Customer Psychology"]).pains),
    },
    competitors: report["Competitor Intelligence"] || {},
    ideas: { experiments: asArray(report["20 Growth Experiments"]) },
    captions: {
      caption_bank: asArray(report["Caption Bank"]),
      hashtag_bank: asArray(report["Hashtag Generator"]),
    },
    templates: { templates: [] },
    brandKit: {},
    roiTool: report["ROI Calculator"] || {},
    premiumGrowth: { modules: [] },
    fullReport: report,
  };
}

function normalizeWorkspace(
  result: WorkspaceResult,
  payload: WorkspacePayload | null,
) {
  const report = result.strategy || {};
  const tabs = isRecord(report.tabs) ? report.tabs : fallbackTabs(report);
  const digital = isDigitalContext(report, payload);
  const leadService = isLeadServiceContext(report, payload);
  const business = {
    name: asText(
      asRecord(report.business).name,
      payload?.biz_name || "Generated Plan",
    ),
    tag: asText(
      asRecord(report.business).tag,
      `${payload?.biz_industry || "Business"} · ${payload?.biz_location || "Market"}`,
    ),
    positioning_summary: asText(
      asRecord(report.business).positioning_summary,
      asText(
        asRecord(report["Business Health Snapshot"]).diagnosis,
        "A strategy workspace built from CAC's knowledge library.",
      ),
    ),
    customer_model: asText(
      asRecord(report.business).customer_model,
      payload?.biz_customer_model || "Customer model",
    ),
  };
  const scores = Array.isArray(report.scores)
    ? report.scores.map((score) => asRecord(score)).slice(0, 4)
    : [
        {
          label: "Can people find you online?",
          score: 50,
          reason: "Based on the submitted business profile.",
        },
        {
          label: "Are your posts clear?",
          score: 50,
          reason: "Based on profile depth and proof readiness.",
        },
        digital
          ? {
              label: "Can users find and understand you online?",
              score: 50,
              reason:
                "Based on website clarity, demo visibility, social proof, and signup path.",
            }
          : leadService
            ? {
                label: "Can ideal clients find and trust you online?",
                score: 50,
                reason:
                  "Based on portfolio proof, case studies, proposal path, and lead quality signals.",
              }
            : {
                label: "Can nearby customers find you on Google?",
                score: 50,
                reason: "Based on current channels and local readiness.",
              },
        {
          label: "Will customers come back?",
          score: 50,
          reason: "Based on follow-up and repeat purchase readiness.",
        },
      ];

  const diagnostics = asRecord(report.diagnostics);

  return { report, tabs, business, scores, diagnostics };
}

export function StrategyWorkspace({
  result,
  payload,
  onBack,
  onPrint,
}: StrategyWorkspaceProps) {
  const { report, tabs, business, scores, diagnostics } = useMemo(
    () => normalizeWorkspace(result, payload),
    [result, payload],
  );
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>("calendar");
  const [selectedDay, setSelectedDay] = useState<StrategyRecord | null>(null);
  const [extraCustomers, setExtraCustomers] = useState(10);
  const [conversionRate, setConversionRate] = useState(8);

  const calendarDays = asArray(asRecord(tabs.calendar).days)
    .map((day) => asRecord(day))
    .slice(0, 30);
  const strategySteps = asArray(asRecord(tabs.strategy).steps)
    .map((step) => asRecord(step))
    .slice(0, 10);
  const psychology = asRecord(tabs.psychology);
  const psychologyCards = asArray(psychology.customer_thoughts).map((item) =>
    asRecord(item),
  );
  const personas = asArray(asRecord(tabs.clientPersona).personas).map(
    (persona) => asRecord(persona),
  );
  const painPoints = asArray(asRecord(tabs.painPoints).items).map((item) =>
    asRecord(item),
  );
  const competitors = asRecord(tabs.competitors);
  const competitorArchetypes = asArray(competitors.archetypes).map((item) =>
    asRecord(item),
  );
  const experiments = asArray(asRecord(tabs.ideas).experiments)
    .map((item) => asRecord(item))
    .slice(0, 20);
  const captions = asRecord(tabs.captions);
  const captionBank = asArray(captions.caption_bank)
    .map((item) => asText(item))
    .filter(Boolean);
  const hashtagBank = asArray(captions.hashtag_bank)
    .map((item) => asText(item))
    .filter(Boolean);
  const templates = asArray(asRecord(tabs.templates).templates).map((item) =>
    asRecord(item),
  );
  const brandKit = asRecord(tabs.brandKit);
  const roiTool = asRecord(tabs.roiTool);
  const premiumModules = asArray(asRecord(tabs.premiumGrowth).modules).map(
    (item) => asRecord(item),
  );
  const fullReport = isRecord(tabs.fullReport)
    ? tabs.fullReport
    : Object.fromEntries(
        Object.entries(report).filter(
          ([key]) => !["business", "meta", "scores", "tabs"].includes(key),
        ),
      );
  const avgTicket = parseTicket(
    asText(roiTool.average_transaction, payload?.biz_ticket),
  );
  const estimatedRevenue = extraCustomers * avgTicket * (conversionRate / 100);
  const digital = isDigitalContext(report, payload);
  const leadService = isLeadServiceContext(report, payload);
  const education = isEducationContext(report, payload);
  const competitorTitle = digital
    ? "Alternatives Customers May Use"
    : education
      ? "Other Learning Options Customers May Choose"
      : leadService
        ? "Alternatives Clients May Choose"
        : "Other Shops Customers May Choose";
  const calendarSubtitle = digital
    ? `${calendarDays.length} different post ideas built from the product details, user context, and selected channels.`
    : `${calendarDays.length} different post ideas built from the business details, local context, and selected channels.`;
  const captionPlatformOptions = Array.from(
    new Set(
      [
        ...(Array.isArray(payload?.platforms) ? payload.platforms : []),
        "Instagram",
        "WhatsApp",
        "Google Business",
      ].filter((platform) => platform && platform !== "None yet"),
    ),
  ).slice(0, 5);

  return (
    <div className="bg-[#f6efe4] text-black">
      <div className="no-print mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <header className="mb-6 border-b border-black/10 pb-5">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-black/55 hover:text-[#ff3300]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to brief
          </button>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-sm border border-black/10 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#ff3300]">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{business.tag}</span>
              </div>
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
                {business.name} — Full Plan
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-black/62">
                {business.positioning_summary}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onPrint}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/85"
              >
                <FileText className="h-4 w-4" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:border-[#ff3300]"
              >
                Start Over
              </button>
            </div>
          </div>
        </header>

        <section className="mb-6 rounded-sm bg-black p-4 text-white">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">
              Quick Business Check
            </h2>
            <span className="text-[11px] uppercase tracking-wider text-white/45">
              {asText(
                asRecord(diagnostics.coverage).checks_run,
                "0",
              )}{" "}
              of{" "}
              {asText(
                asRecord(diagnostics.coverage).checks_total,
                "0",
              )}{" "}
              checks run
              {Number(asRecord(diagnostics.coverage).checks_verified) > 0
                ? ` · ${asText(asRecord(diagnostics.coverage).checks_verified)} by opening your site`
                : " · all from your own answers"}
            </span>
          </div>
          {asText(asRecord(diagnostics.coverage).how_to_improve) && (
            <p className="mb-3 text-xs leading-5 text-[#ffb4a1]">
              {asText(asRecord(diagnostics.coverage).how_to_improve)}
            </p>
          )}
          <div className="grid gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10 md:grid-cols-4">
            {scores.map((score, index) => {
              const tone = asText(score.tone, "unknown");
              const bandColour =
                tone === "good"
                  ? "text-[#39d353]"
                  : tone === "warn"
                    ? "text-[#ffb54d]"
                    : tone === "bad"
                      ? "text-[#ff3300]"
                      : "text-white/40";
              const failed = asArray(score.failed).map(asRecord);
              const notChecked = asArray(score.not_checked).map(asRecord);

              return (
                <div
                  key={`${asText(score.label)}-${index}`}
                  className="bg-black p-4"
                >
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                    {asText(score.label, "Check")}
                  </div>

                  {/* The word carries the meaning; the number is supporting
                      detail. "Weak" lands with someone who has never read a
                      marketing report, "55" does not. */}
                  <div
                    className={`font-display text-3xl font-bold ${bandColour}`}
                  >
                    {asText(score.band, "Not checked")}
                  </div>
                  {score.score !== null && score.score !== undefined && (
                    <div className="mt-1 text-xs text-white/40">
                      {asText(score.score)} / 100 ·{" "}
                      {asText(score.checks_run, "0")} of{" "}
                      {asText(score.checks_total, "0")} checks
                    </div>
                  )}

                  <p className="mt-2 text-xs leading-5 text-white/70">
                    {asText(score.plain_meaning, asText(score.reason))}
                  </p>

                  {failed.length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
                      {failed.slice(0, 2).map((item, itemIndex) => (
                        <li
                          key={itemIndex}
                          className="text-[11px] leading-4 text-white/55"
                        >
                          <span className="text-[#ff3300]">✗</span>{" "}
                          {asText(item.evidence)}
                          {asText(item.source) === "verified" && (
                            <span className="ml-1 text-white/30">
                              (we checked your site)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {notChecked.length > 0 && (
                    <p className="mt-2 text-[11px] leading-4 text-white/35">
                      Not checked: {asText(notChecked[0].question)}
                    </p>
                  )}

                  {asText(score.caveat) && (
                    <p className="mt-2 text-[11px] leading-4 text-white/35">
                      {asText(score.caveat)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="mb-5 flex flex-wrap gap-2 border-b border-black/10 pb-3">
          {tabDefs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-black bg-black text-white"
                  : "border-black/10 bg-white text-black/60 hover:border-[#ff3300] hover:text-black"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.id === "competitors" ? competitorTitle : tab.label}
            </button>
          ))}
        </div>

        {activeTab === "calendar" && (
          <WorkspaceSection
            title="30-Day Post Plan"
            subtitle={calendarSubtitle}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {calendarDays.map((day) => (
                <button
                  key={asText(day.day)}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className="rounded-sm border border-black/10 bg-white p-4 text-left transition hover:border-[#ff3300] hover:shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff3300]">
                      Day {asText(day.day)}
                    </span>
                    <span className="rounded-sm bg-black/[0.04] px-2 py-1 text-[10px] font-bold uppercase text-black/50">
                      {asText(day.post_type || day.theme, "Post")}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold leading-tight">
                    {asText(day.hook || day.topic || day.post, "Post idea")}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-black/65">
                    {asText(
                      day.caption || day.ready_caption,
                      "Create one clear post for this day.",
                    )}
                  </p>
                  <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-black/35">
                    Open card
                  </div>
                </button>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {activeTab === "strategy" && (
          <WorkspaceSection
            title="10-Step Marketing Plan"
            subtitle="Each step says what to do, when to do it, and how to know if it helped."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {strategySteps.map((step, index) => (
                <ActionCard
                  key={`${asText(step.title)}-${index}`}
                  eyebrow={`Step ${asText(step.step, String(index + 1))}`}
                  title={asText(step.title, "Growth step")}
                  intro={asText(
                    step.why_this_matters || step.why_suggested || step.reason,
                  )}
                  fields={[
                    ["Steps", asArray(step.steps || step.action_steps)],
                    ["Copy-ready text", asText(step.copy_ready_text)],
                    [
                      "Example for this business",
                      asText(step.example_for_this_business),
                    ],
                    [
                      "Track this",
                      asText(step.track_this || step.what_to_check || step.kpi),
                    ],
                  ]}
                />
              ))}
            </div>
          </WorkspaceSection>
        )}

        {activeTab === "psychology" && (
          <WorkspaceSection
            title="What Customers Think"
            subtitle="Plain-language reasons people hesitate, trust, remember, and buy."
          >
            {psychologyCards.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {psychologyCards.map((card, index) => (
                  <ActionCard
                    key={`${asText(card.customer_thought)}-${index}`}
                    eyebrow={`Customer thought ${index + 1}`}
                    title={asText(card.customer_thought, "Customer thought")}
                    intro={asText(card.what_it_means)}
                    fields={[
                      ["What to show", asText(card.what_to_show)],
                      ["What to say", asText(card.what_to_say)],
                      ["Why this works", asText(card.why_this_works)],
                    ]}
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <ListPanel
                  title="What customers feel"
                  values={asArray(
                    psychology.what_customers_feel ||
                      psychology.emotional_drivers,
                  )}
                />
                <ListPanel
                  title="Why they buy"
                  values={asArray(
                    psychology.why_they_buy || psychology.buying_triggers,
                  )}
                />
                <ListPanel
                  title="Questions customers may ask before buying"
                  values={asArray(
                    psychology.questions_before_buying || psychology.objections,
                  )}
                />
                <ListPanel
                  title="Things that make customers trust you"
                  values={asArray(
                    psychology.things_that_build_trust ||
                      psychology.trust_builders,
                  )}
                />
                <ListPanel
                  title="Ways to talk about your product"
                  values={asArray(
                    psychology.ways_to_talk_about_it ||
                      psychology.messaging_angles,
                  )}
                  wide
                />
              </div>
            )}
          </WorkspaceSection>
        )}

        {activeTab === "clientPersona" && (
          <WorkspaceSection
            title="Example Customer Types"
            subtitle="Examples based on your business details, not real people."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {personas.map((persona, index) => (
                <article
                  key={`${asText(persona.label || persona.name)}-${index}`}
                  className="rounded-sm border border-black/10 bg-white p-4"
                >
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#ff3300]">
                    {asText(
                      persona.note || persona.type,
                      "Example based on your business details",
                    )}
                  </div>
                  <h3 className="font-display text-2xl font-bold">
                    {asText(
                      persona.label || persona.name,
                      "Example customer type",
                    )}
                  </h3>
                  <div className="mt-4 grid gap-3">
                    <MiniBlock
                      title="Who they are"
                      value={asText(
                        persona.who_they_are || persona.role_lifestyle,
                      )}
                    />
                    <MiniBlock
                      title="What they want"
                      value={asText(persona.what_they_want || persona.goal)}
                    />
                    <MiniBlock
                      title="What may stop them"
                      value={asText(persona.what_may_stop_them || persona.pain)}
                    />
                    <MiniBlock
                      title="How to convince them"
                      value={asText(
                        persona.how_to_convince_them || persona.pitch_strategy,
                      )}
                    />
                    <MiniBlock
                      title="Best channel"
                      value={asText(persona.best_channel)}
                    />
                    <MiniBlock
                      title="Message to use"
                      value={asText(
                        persona.message_to_use || persona.resonant_message,
                      )}
                    />
                  </div>
                </article>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {activeTab === "painPoints" && (
          <WorkspaceSection
            title="Customer Problems"
            subtitle="Each problem maps to what to do, what to post, and what to say."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {painPoints.map((item, index) => (
                <ActionCard
                  key={`${asText(item.customer_problem || item.problem || item.pain)}-${index}`}
                  eyebrow={`Problem ${index + 1}`}
                  title={asText(
                    item.customer_problem || item.problem || item.pain,
                  )}
                  intro={asText(
                    item.why_they_feel_this ||
                      item.why ||
                      item.what_makes_them_trust,
                  )}
                  fields={[
                    [
                      "Your solution",
                      asText(item.your_solution || item.what_to_do),
                    ],
                    [
                      "Text to use",
                      asText(
                        item.text_to_use ||
                          item.what_to_say ||
                          item.offer_angle,
                      ),
                    ],
                    [
                      "Content idea",
                      asText(
                        item.content_idea ||
                          item.post_idea ||
                          item.content_angle,
                      ),
                    ],
                  ]}
                />
              ))}
            </div>
          </WorkspaceSection>
        )}

        {activeTab === "competitors" && (
          <WorkspaceSection
            title={competitorTitle}
            subtitle={asText(competitors.basis, "Practical market comparison.")}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {competitorArchetypes.map((item, index) => (
                <ActionCard
                  key={`${asText(item.other_option || item.label)}-${index}`}
                  eyebrow={`Option ${index + 1}`}
                  title={asText(item.other_option || item.label)}
                  intro={asText(item.what_they_do_well || item.strengths)}
                  fields={[
                    [
                      "What they do well",
                      asText(item.what_they_do_well || item.strengths),
                    ],
                    [
                      "Where this business can win",
                      asText(
                        item.where_this_business_can_win ||
                          item.how_to_beat_them ||
                          item.beat_them,
                      ),
                    ],
                    ["Message to use", asText(item.message_to_use)],
                    ["Post idea", asText(item.post_idea)],
                  ]}
                />
              ))}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {asArray(competitors.platform_plan).map((move, index) => {
                const item = asRecord(move);
                return (
                  <MiniBlock
                    key={index}
                    title={asText(item.platform, `Move ${index + 1}`)}
                    value={asText(item.move)}
                  />
                );
              })}
            </div>
          </WorkspaceSection>
        )}

        {activeTab === "ideas" && (
          <WorkspaceSection
            title="Post Ideas"
            subtitle="Ready-to-post ideas and small growth moves with the exact caption, place to post, and customer action."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {experiments.map((idea, index) => (
                <ActionCard
                  key={`${asText(idea.title)}-${index}`}
                  eyebrow={
                    index < 10
                      ? `Post idea ${index + 1}`
                      : `Growth move ${index - 9}`
                  }
                  title={asText(idea.title, "Thing to try")}
                  intro={asText(
                    idea.expected_help ||
                      idea.why_it_can_work ||
                      idea.why_it_fits ||
                      idea.why_it_matters ||
                      idea.why,
                  )}
                  fields={[
                    [
                      "Do this",
                      asText(
                        idea.exact_action ||
                          idea.what_to_show ||
                          idea.what_to_do ||
                          idea.test,
                      ),
                    ],
                    [
                      "Where to use",
                      asText(
                        idea.where_to_post || idea.channel || idea.best_channel,
                      ),
                    ],
                    ["Format", asText(idea.recommended_format)],
                    [
                      "Steps",
                      asArray(
                        idea.how_to_execute || idea.how_to_try || idea.steps,
                      ),
                    ],
                    [
                      "Caption",
                      asText(
                        idea.caption || idea.copy_ready_text || idea.post_text,
                      ),
                    ],
                    [
                      "Ask people to",
                      asText(
                        idea.customer_action ||
                          idea.what_to_check ||
                          idea.metric,
                      ),
                    ],
                    [
                      "Check",
                      asText(
                        idea.track_this ||
                          idea.what_to_check ||
                          idea.metric ||
                          idea.expected_result,
                      ),
                    ],
                  ]}
                />
              ))}
            </div>
          </WorkspaceSection>
        )}

        {activeTab === "captions" && (
          <WorkspaceSection
            title="Ready-to-Use Captions"
            subtitle="Simple caption options shaped by the business details."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {(captionBank.length
                ? captionBank
                : [
                    "Show the product clearly, explain the next step, and ask people to message.",
                  ]
              )
                .slice(0, 10)
                .map((caption, index) => (
                  <ActionCard
                    key={`${caption}-${index}`}
                    eyebrow={`Caption ${index + 1}`}
                    title={asText(
                      asArray(captions.suggested_topics)[index],
                      "Ready caption",
                    )}
                    intro={caption}
                    fields={[
                      ["Where to use", captionPlatformOptions.join(", ")],
                      [
                        "Customer action",
                        caption.match(/message|whatsapp/i)
                          ? "Message on WhatsApp."
                          : "Save, reply, or share with someone who needs this.",
                      ],
                      ["Hashtags", hashtagBank.slice(0, 8).join(" ")],
                    ]}
                  />
                ))}
            </div>
          </WorkspaceSection>
        )}

        {activeTab === "templates" && (
          <WorkspaceSection
            title="Message Templates"
            subtitle="WhatsApp, email, DM, and bio drafts shaped by the business profile."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {(templates.length
                ? templates
                : [
                    {
                      type: "First reply",
                      channel: "WhatsApp",
                      template: `${business.name} can help with the right next step.`,
                    },
                  ]
              ).map((template, index) => (
                <ActionCard
                  key={`${asText(template.type)}-${index}`}
                  eyebrow={asText(template.channel, "Message")}
                  title={asText(template.type, `Template ${index + 1}`)}
                  intro={asText(template.template)}
                  fields={[
                    ["Where to use", asText(template.channel, "WhatsApp / DM")],
                    [
                      "Why this fits",
                      asText(
                        template.why_suggested ||
                          template.why_this_helps ||
                          "Use this when someone asks a common question.",
                      ),
                    ],
                  ]}
                />
              ))}
            </div>
          </WorkspaceSection>
        )}

        {activeTab === "brandKit" && (
          <WorkspaceSection
            title="Brand Style"
            subtitle="Voice, words to use, words to avoid, short bio, and simple offer line."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <MiniBlock
                title="Brand voice"
                value={asText(brandKit.brand_voice)}
              />
              <MiniBlock title="Short bio" value={asText(brandKit.short_bio)} />
              <MiniBlock
                title="Simple offer line"
                value={asText(
                  brandKit.simple_offer_line || brandKit.offer_statement,
                )}
                wide
              />
              <ListPanel
                title="Messages to repeat"
                values={asArray(
                  brandKit.messages_to_repeat || brandKit.messaging_pillars,
                )}
              />
              <ListPanel
                title="Words to use"
                values={asArray(brandKit.words_to_use || brandKit.do_language)}
              />
              <ListPanel
                title="Words to avoid"
                values={asArray(
                  brandKit.words_to_avoid || brandKit.dont_language,
                )}
              />
              <ListPanel
                title="What customers should do next"
                values={asArray(brandKit.customer_actions || brandKit.cta_bank)}
              />
            </div>
          </WorkspaceSection>
        )}

        {activeTab === "roiTool" && (
          <WorkspaceSection
            title="Ad Result Calculator"
            subtitle="A rough planning helper using the average order value from the brief."
          >
            <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="rounded-sm border border-black/10 bg-white p-4">
                <FieldLabel label="Extra customers/orders" />
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={extraCustomers}
                  onChange={(event) =>
                    setExtraCustomers(Number(event.target.value))
                  }
                  className="mb-2 w-full accent-[#ff3300]"
                />
                <div className="mb-4 font-display text-3xl font-bold">
                  {extraCustomers}
                </div>
                <FieldLabel label="People who buy after seeing the ad" />
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={conversionRate}
                  onChange={(event) =>
                    setConversionRate(Number(event.target.value))
                  }
                  className="mb-2 w-full accent-[#ff3300]"
                />
                <div className="font-display text-3xl font-bold">
                  {conversionRate}%
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <MiniBlock
                  title="Average order value"
                  value={asText(
                    roiTool.average_transaction,
                    payload?.biz_ticket || "Not provided",
                  )}
                />
                <MiniBlock
                  title="Possible extra sales value"
                  value={money(estimatedRevenue)}
                />
                <MiniBlock
                  title="How to think about it"
                  value={asText(
                    asRecord(roiTool.assumptions).break_even_logic ||
                      roiTool.break_even_logic,
                  )}
                  wide
                />
                <MiniBlock
                  title="Track weekly"
                  value={asArray(
                    asRecord(roiTool.assumptions).track_weekly ||
                      roiTool.track_weekly,
                  )}
                  wide
                />
              </div>
            </div>
          </WorkspaceSection>
        )}

        {activeTab === "premiumGrowth" && (
          <WorkspaceSection
            title="Advanced Growth Plan"
            subtitle="Useful next moves after the basics are working."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {premiumModules.map((module, index) => (
                <ActionCard
                  key={`${asText(module.title)}-${index}`}
                  eyebrow={`Advanced card ${asText(module.module, String(index + 1))} · ${asText(module.timeline)}`}
                  title={asText(module.title)}
                  intro={asText(
                    module.what_user_gets || module.action,
                  )}
                  fields={[
                    [
                      "Small preview",
                      asText(module.small_preview || module.output),
                    ],
                    [
                      "Why this helps",
                      asText(module.why_this_helps || module.why),
                    ],
                    ["Unlock message", asText(module.unlock_message)],
                  ]}
                />
              ))}
            </div>
          </WorkspaceSection>
        )}

        {activeTab === "fullReport" && (
          <WorkspaceSection
            title="Full Plan"
            subtitle="A clean summary of what to do first. The full 30-day calendar stays in the calendar tab."
          >
            <FullPlanView
              fullReport={fullReport}
              businessName={business.name}
              calendarDays={calendarDays}
              strategySteps={strategySteps}
              painPoints={painPoints}
              templates={templates}
              onOpenCalendar={() => setActiveTab("calendar")}
            />
          </WorkspaceSection>
        )}
      </div>

      {selectedDay && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
          onClick={() => setSelectedDay(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-day-title"
            className="max-h-full w-full max-w-3xl overflow-auto rounded-sm bg-[#f6efe4] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-black/10 pb-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#ff3300]">
                  Day {asText(selectedDay.day)} ·{" "}
                  {asText(selectedDay.post_type || selectedDay.theme, "Post")}
                </div>
                <h2
                  id="calendar-day-title"
                  className="mt-1 font-display text-3xl font-bold"
                >
                  Day {asText(selectedDay.day)} -{" "}
                  {asText(
                    selectedDay.hook || selectedDay.topic || selectedDay.post,
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="rounded-sm border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold"
              >
                Close
              </button>
            </div>
            <ActionCard
              eyebrow={asText(selectedDay.platform, "Instagram / WhatsApp")}
              title={asText(selectedDay.post_type || selectedDay.theme, "Post")}
              intro={asText(
                selectedDay.hook || selectedDay.topic || selectedDay.post,
              )}
              fields={[
                [
                  "Show",
                  asArray(
                    selectedDay.how_to_create || selectedDay.what_to_show,
                  ),
                ],
                [
                  "Caption",
                  asText(
                    selectedDay.caption ||
                      selectedDay.ready_caption ||
                      selectedDay.full_caption,
                  ),
                ],
                ["Customer action", asText(selectedDay.customer_action)],
                [
                  "Why this helps",
                  asText(
                    selectedDay.why_this_works || selectedDay.why_this_helps,
                  ),
                ],
                ["Hashtags", asArray(selectedDay.hashtags)],
              ]}
            />
          </div>
        </div>
      )}

      <section className="print-only px-10 py-8">
        <h1 className="font-display text-4xl font-bold">
          {business.name} — Full Plan
        </h1>
        <p className="mt-3 text-sm leading-6">{business.positioning_summary}</p>
        <div className="mt-6 grid grid-cols-4 gap-3">
          {scores.map((score, index) => (
            <div key={index} className="border border-black/20 p-3">
              <div className="text-xs font-bold uppercase">
                {asText(score.label)}
              </div>
              <div className="mt-2 text-3xl font-bold">
                {asText(score.score)}
              </div>
              <p className="mt-2 text-xs">{asText(score.reason)}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <FullPlanView
            fullReport={fullReport}
            businessName={business.name}
            calendarDays={calendarDays}
            strategySteps={strategySteps}
            painPoints={painPoints}
            templates={templates}
          />
        </div>
      </section>
    </div>
  );
}

function WorkspaceSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-1 border-b border-black/10 pb-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">
            {title}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-black/55">
            {subtitle}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FullPlanView({
  fullReport,
  businessName,
  calendarDays,
  strategySteps,
  painPoints,
  templates,
  onOpenCalendar,
}: {
  fullReport: StrategyRecord;
  businessName: string;
  calendarDays: StrategyRecord[];
  strategySteps: StrategyRecord[];
  painPoints: StrategyRecord[];
  templates: StrategyRecord[];
  onOpenCalendar?: () => void;
}) {
  const quickSummary = asRecord(fullReport["Quick Summary"]);
  const launchReadiness = asRecord(
    fullReport["Launch Readiness"] || fullReport["What To Fix First"],
  );
  const firstCustomerPlan = asRecord(
    fullReport["First Customer Plan"] || fullReport["Customer Plan"],
  );
  const numbersToWatch = asArray(fullReport["Numbers To Watch"]);
  const postsTitle = fullReport["Top 5 Posts Before Opening"]
    ? "Top 5 Posts Before Opening"
    : "Top 5 Posts To Try";
  const topPosts = calendarDays.slice(0, 5);
  const topMessages = templates.length
    ? templates.slice(0, 5)
    : asArray(fullReport["Top WhatsApp Messages"])
        .map((item) => asRecord(item))
        .slice(0, 5);
  const topWorries = painPoints.length
    ? painPoints.slice(0, 5)
    : asArray(fullReport["Top Customer Worries"])
        .map((item) => asRecord(item))
        .slice(0, 5);
  const firstMoves = strategySteps.slice(0, 5);

  return (
    <div className="grid gap-4">
      <ActionCard
        eyebrow="Quick Summary"
        title={`${businessName} - what matters first`}
        intro={asText(
          quickSummary.simple_read ||
            quickSummary.summary ||
            "Start with the clearest first actions.",
        )}
        fields={[
          ["Business", asText(quickSummary.business || businessName)],
          ["Location", asText(quickSummary.location)],
          ["Best channels", asText(quickSummary.best_channels)],
          ["Product", asText(quickSummary.product)],
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ActionCard
          eyebrow="Launch Readiness"
          title="Get ready to be trusted"
          intro={asText(
            launchReadiness.prepare ||
              launchReadiness.fix_now ||
              "Prepare the basics before pushing for more customers.",
          )}
          fields={[
            ["First goal", asText(launchReadiness.first_goal)],
            ["Avoid", asText(launchReadiness.avoid)],
          ]}
        />
        <ActionCard
          eyebrow="First Customer Plan"
          title="Start with the easiest real buyers"
          intro={asText(firstCustomerPlan.who_to_start_with)}
          fields={[
            [
              "What to offer first",
              asText(firstCustomerPlan.what_to_offer_first),
            ],
            [
              "Where to find them",
              asText(firstCustomerPlan.where_to_find_them),
            ],
            ["What to say", asArray(firstCustomerPlan.what_to_say)],
          ]}
        />
      </div>

      <div>
        <h3 className="mb-3 font-display text-2xl font-bold">Do This First</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {firstMoves.map((step, index) => (
            <ActionCard
              key={`${asText(step.title)}-${index}`}
              eyebrow={`Move ${index + 1}`}
              title={asText(step.title)}
              intro={asText(
                step.why_this_matters || step.reason || step.why_suggested,
              )}
              fields={[
                ["Do this", asArray(step.steps || step.action_steps)],
                ["Copy-ready text", asText(step.copy_ready_text)],
                [
                  "How to know it worked",
                  asText(step.track_this || step.what_to_check),
                ],
              ]}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-display text-2xl font-bold">{postsTitle}</h3>
          {onOpenCalendar && (
            <button
              type="button"
              onClick={onOpenCalendar}
              className="inline-flex items-center justify-center rounded-sm border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:border-[#ff3300]"
            >
              Open full calendar
            </button>
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {topPosts.map((day) => (
            <ActionCard
              key={`full-plan-day-${asText(day.day)}`}
              eyebrow={`Day ${asText(day.day)} · ${asText(day.post_type || day.theme, "Post")}`}
              title={asText(day.hook || day.topic || day.post)}
              intro={asText(day.caption || day.ready_caption)}
              fields={[
                ["Show", asArray(day.how_to_create || day.what_to_show)],
                ["Customer action", asText(day.customer_action)],
                [
                  "Why this helps",
                  asText(day.why_this_works || day.why_this_helps),
                ],
              ]}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 font-display text-2xl font-bold">
            Top WhatsApp Messages
          </h3>
          <div className="grid gap-4">
            {topMessages.map((message, index) => (
              <ActionCard
                key={`${asText(message.type)}-${index}`}
                eyebrow={asText(message.channel, "WhatsApp")}
                title={asText(message.type, `Message ${index + 1}`)}
                intro={asText(message.template)}
                fields={[
                  [
                    "When to use",
                    asText(
                      message.why_suggested ||
                        "Use this when a customer asks this question.",
                    ),
                  ],
                ]}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-display text-2xl font-bold">
            Top Customer Worries
          </h3>
          <div className="grid gap-4">
            {topWorries.map((item, index) => (
              <ActionCard
                key={`${asText(item.customer_problem || item.problem || item.pain)}-${index}`}
                eyebrow={`Worry ${index + 1}`}
                title={asText(
                  item.customer_problem || item.problem || item.pain,
                )}
                intro={asText(
                  item.why_they_feel_this || item.what_makes_them_trust,
                )}
                fields={[
                  [
                    "Your answer",
                    asText(item.your_solution || item.what_to_do),
                  ],
                  ["Text to use", asText(item.text_to_use || item.what_to_say)],
                ]}
              />
            ))}
          </div>
        </div>
      </div>

      <ActionCard
        eyebrow="Numbers To Watch"
        title="Track simple signals, not vanity numbers"
        intro="Check these every week so the plan improves from real customer behaviour."
        fields={[["Watch these", numbersToWatch]]}
      />
    </div>
  );
}

function ActionCard({
  eyebrow,
  title,
  intro,
  fields,
}: {
  eyebrow: string;
  title: string;
  intro?: StrategyValue | StrategyValue[];
  fields: [string, StrategyValue | StrategyValue[] | string][];
}) {
  const visibleFields = fields.filter(([, value]) => {
    if (Array.isArray(value))
      return value.length > 0 && value.some((item) => asText(item).trim());
    return asText(value).trim();
  });

  return (
    <article className="rounded-sm border border-black/10 bg-white p-4">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#ff3300]">
        {eyebrow}
      </div>
      <h3 className="font-display text-2xl font-bold leading-tight">{title}</h3>
      {asText(intro).trim() && (
        <p className="mt-2 text-sm leading-6 text-black/65">{asText(intro)}</p>
      )}
      {visibleFields.length > 0 && (
        <div className="mt-4 divide-y divide-black/10 border-t border-black/10">
          {visibleFields.map(([label, value]) => (
            <ActionField key={label} label={label} value={value} />
          ))}
        </div>
      )}
    </article>
  );
}

function ActionField({
  label,
  value,
}: {
  label: string;
  value: StrategyValue | StrategyValue[] | string;
}) {
  return (
    <div className="py-3">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-black/40">
        {label}
      </div>
      {Array.isArray(value) ? (
        <ol className="space-y-1 text-sm leading-6 text-black/72">
          {value.map((item, index) => (
            <li key={index} className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                {index + 1}
              </span>
              <span>{asText(item)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="whitespace-pre-line text-sm leading-6 text-black/72">
          {asText(value)}
        </p>
      )}
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-black/45">
      {label}
    </label>
  );
}

function MiniBlock({
  title,
  value,
  wide,
}: {
  title: string;
  value: StrategyValue | StrategyValue[];
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-sm border border-black/10 bg-white p-3 ${wide ? "md:col-span-2" : ""}`}
    >
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-black/40">
        {title}
      </div>
      {Array.isArray(value) ? (
        <ul className="space-y-1 text-sm leading-6 text-black/70">
          {value.map((item, index) => (
            <li key={index}>- {asText(item)}</li>
          ))}
        </ul>
      ) : (
        <p className="whitespace-pre-line text-sm leading-6 text-black/70">
          {asText(value, "Not enough data yet.")}
        </p>
      )}
    </div>
  );
}

function ListPanel({
  title,
  values,
  wide,
}: {
  title: string;
  values: StrategyValue[];
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-sm border border-black/10 bg-white p-4 ${wide ? "lg:col-span-2" : ""}`}
    >
      <h3 className="mb-3 font-display text-xl font-bold">{title}</h3>
      <ul className="space-y-2 text-sm leading-6 text-black/70">
        {values.length ? (
          values.map((value, index) => (
            <li key={index} className="border-l border-[#ff3300]/50 pl-3">
              {asText(value)}
            </li>
          ))
        ) : (
          <li>Not enough data yet.</li>
        )}
      </ul>
    </div>
  );
}
