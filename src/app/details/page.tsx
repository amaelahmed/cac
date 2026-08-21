"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  FileClock,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { StrategyWorkspace } from "@/components/StrategyWorkspace";
import { signIn, useSession } from "@/lib/auth-client";
import businessDefaults from "../../../data/business-defaults/business-defaults.json";
import { normalizeUrlInput } from "../../../shared/normalizeUrlInput.js";

type BusinessFormData = {
  biz_name: string;
  biz_industry: string;
  biz_location: string;
  biz_stage: string;
  biz_type: string;
  biz_age: string;
  biz_team: string;
  biz_offer: string;
  biz_audience: string;
  biz_customer_model: string;
  biz_ticket: string;
  biz_revenue: string;
  biz_revenue_model: string;
  biz_budget: string;
  biz_followers: string;
  biz_personality: string;
  biz_challenge: string;
  biz_usp: string;
  biz_website: string;
  biz_comp_website: string;
  biz_extra: string;
};

type StrategyValue =
  | string
  | number
  | boolean
  | null
  | StrategyValue[]
  | { [key: string]: StrategyValue };

type GenerationResult = {
  strategy: Record<string, StrategyValue>;
  confidence?: {
    score: number;
    status: string;
    reasoning?: string[];
  };
  telemetry?: {
    ai_calls_count: number;
    knowledge_objects_used: number;
    fallback_used: boolean;
    generation_source: string;
    estimated_cost_saved?: {
      amount_usd: number;
      basis: string;
    };
  };
  generatedAt?: string;
  savedReportId?: string;
  // The server answers with the fast plan first, then rewrites the copy with AI
  // and saves over the same row. "running" means a better version is coming.
  aiEnrichment?: "running" | "ready" | "failed" | "skipped";
};

type ReportSummary = {
  id: string;
  business_name: string;
  business_type: string;
  location: string;
  created_at: string;
};

type LocationSuggestion = {
  displayName: string;
  city: string;
  state: string;
  country: string;
  countryCode: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
};

type WebSnapshot = {
  url: string;
  title: string;
  description: string;
  headings: string[];
  callsToAction: string[];
  detectedGaps: string[];
  text?: string;
  wordCount?: number;
};

type BusinessPayload = BusinessFormData & {
  platforms: string[];
  goal: string[];
  location_insight: LocationSuggestion | null;
  own_website_snapshot: WebSnapshot | null;
  competitor_website_snapshot: WebSnapshot | null;
};

type LocalDevSession = {
  enabled: boolean;
  session?: {
    user: {
      id: string;
      email: string;
      name: string;
    };
  } | null;
};

type ViewMode = "form" | "loading" | "report";

type SelectField = {
  id: keyof BusinessFormData;
  label: string;
  options: Array<string | { value: string; label: string }>;
  optional?: boolean;
  multiSelect?: boolean;
};

type BusinessDefaultRule = {
  id: string;
  match: string[];
  form_defaults: Partial<Record<keyof BusinessFormData, string>>;
  platforms: string[];
  goals: string[];
  note: string;
};

const businessDefaultRules = (
  businessDefaults as { rules: BusinessDefaultRule[] }
).rules;
const initialFormData: BusinessFormData = {
  biz_name: "",
  biz_industry: "",
  biz_location: "",
  biz_stage: "",
  biz_type: "",
  biz_age: "",
  biz_team: "",
  biz_offer: "",
  biz_audience: "",
  biz_customer_model: "",
  biz_ticket: "",
  biz_revenue: "",
  biz_revenue_model: "",
  biz_budget: "",
  biz_followers: "",
  biz_personality: "",
  biz_challenge: "",
  biz_usp: "",
  biz_website: "",
  biz_comp_website: "",
  biz_extra: "",
};

const lowQualityValues = new Set([
  "test",
  "testing",
  "asdf",
  "qwerty",
  "abc",
  "abcd",
  "demo",
  "sample",
  "none",
  "nil",
  "na",
  "n/a",
  "xxx",
  "xyz",
  "random",
  "gibberish",
]);

const requiredFields: Array<keyof BusinessFormData> = [
  "biz_name",
  "biz_industry",
  "biz_location",
  "biz_stage",
  "biz_type",
  "biz_offer",
  "biz_audience",
  "biz_customer_model",
  "biz_challenge",
  "biz_usp",
];

const loadingSteps = [
  "Checking business details",
  "Reading live web signals",
  "Finding local customer clues",
  "Choosing useful business ideas",
  "Building the post plan",
  "Preparing the full plan",
];

const platformOptions = [
  "Instagram",
  "WhatsApp",
  "Google Business",
  "Website",
  "YouTube",
  "LinkedIn",
  "Facebook",
  "Zomato/Swiggy",
  "App Store",
  "Product Hunt",
  "None yet",
];

const goalOptions = [
  { id: "awareness", name: "More people should know us" },
  { id: "customers", name: "Get more customers" },
  { id: "online_sales", name: "Increase online sales" },
  { id: "retention", name: "Bring customers back" },
  { id: "credibility", name: "Build trust" },
  { id: "launch", name: "Launch properly" },
];

const selectFields: SelectField[] = [
  {
    id: "biz_industry",
    label: "Industry / niche",
    options: [
      { value: "Cafe", label: "Cafe / Coffee shop" },
      { value: "Restaurant", label: "Restaurant / Dine-in" },
      { value: "Cloud Kitchen", label: "Cloud kitchen / Delivery food" },
      { value: "Bakery / Sweets", label: "Bakery / Sweets shop" },
      { value: "Catering / Events Food", label: "Catering / Event food" },
      { value: "Food Truck / Street Food", label: "Food truck / Street food" },
      { value: "AI App / Vibe-coded App", label: "AI app / Vibe-coded app" },
      { value: "SaaS / Micro SaaS", label: "SaaS / Micro SaaS" },
      {
        value: "Mobile App / Consumer App",
        label: "Mobile app / Consumer app",
      },
      {
        value: "Developer Tool",
        label: "Developer tool / software for developers",
      },
      { value: "Creator / Media Business", label: "Creator / Media business" },
      { value: "Newsletter / Publication", label: "Newsletter / Publication" },
      {
        value: "Podcast / YouTube Channel",
        label: "Podcast / YouTube channel",
      },
      { value: "E-commerce / D2C", label: "E-commerce / D2C brand" },
      { value: "Retail Shop / Boutique", label: "Retail shop / Boutique" },
      { value: "Fashion / Clothing", label: "Fashion / Clothing" },
      { value: "Jewellery / Accessories", label: "Jewellery / Accessories" },
      {
        value: "Custom Gifts / Personalised Products",
        label: "Custom gifts / Personalised products",
      },
      { value: "Printing / Merchandise", label: "Printing / Merchandise" },
      { value: "Gift Shop", label: "Gift shop" },
      {
        value: "Stationery / Campus Store",
        label: "Stationery / Campus store",
      },
      { value: "Toy / Kids Products", label: "Toy / Kids products" },
      { value: "Grocery / Supermarket", label: "Grocery / Supermarket" },
      {
        value: "Electronics / Mobile Store",
        label: "Electronics / Mobile store",
      },
      { value: "Home Decor / Furniture", label: "Home decor / Furniture" },
      { value: "Gym", label: "Fitness center / Gym" },
      { value: "Yoga / Wellness Studio", label: "Yoga / Wellness studio" },
      { value: "Hair Salon", label: "Salon / Beauty / Barber" },
      {
        value: "Spa / Skincare / Aesthetic",
        label: "Spa / Skincare / Aesthetic clinic",
      },
      { value: "Dental Clinic", label: "Dental clinic" },
      { value: "Healthcare", label: "Clinic / Healthcare" },
      {
        value: "Ayurveda / Alternative Wellness",
        label: "Ayurveda / Alternative wellness",
      },
      { value: "Real Estate", label: "Real estate / Property" },
      { value: "Digital Marketing Agency", label: "Digital marketing agency" },
      { value: "Consulting / Coaching", label: "Consulting / Coaching" },
      { value: "CA / Accounting", label: "CA / Accounting" },
      { value: "Legal Services", label: "Legal / Advocate services" },
      {
        value: "Education / Coaching Center",
        label: "Education / Coaching center",
      },
      { value: "School / Preschool", label: "School / Preschool" },
      {
        value: "Photography / Videography",
        label: "Photography / Videography",
      },
      { value: "Event Management", label: "Event management" },
      { value: "Hotel / Homestay", label: "Hotel / Homestay" },
      { value: "Travel Agency", label: "Travel agency" },
      {
        value: "Interior Design / Architecture",
        label: "Interior design / Architecture",
      },
      {
        value: "Construction / Contractor",
        label: "Construction / Contractor",
      },
      { value: "Auto Service / Car Care", label: "Auto service / Car care" },
      { value: "Cleaning / Laundry", label: "Cleaning / Laundry service" },
      { value: "Repair / Maintenance", label: "Repair / Maintenance service" },
      { value: "Logistics / Delivery", label: "Logistics / Delivery service" },
      {
        value: "Manufacturing / Business Supply",
        label: "Manufacturing / business supply",
      },
      { value: "Pet Care", label: "Pet care / Grooming" },
      { value: "Generic Business", label: "Other local business" },
    ],
  },
  {
    id: "biz_customer_model",
    label: "Who buys from you?",
    multiSelect: true,
    options: [
      "Individual customers",
      "Small business owners",
      "Direct online buyers",
      "Both individuals and businesses",
      "App users",
      "Startup / founder teams",
      "Marketplace buyers and sellers",
      "Developers / makers",
      "Creator / media audience",
    ],
  },
  {
    id: "biz_type",
    label: "Business type",
    options: [
      "Local physical business",
      "Online only",
      "Online + physical",
      "SaaS / Subscription app",
      "AI / Vibe-coded app",
      "Service at customer location",
      "Home-based business",
    ],
  },
  {
    id: "biz_stage",
    label: "Current business situation",
    options: [
      "Not launched yet",
      "Just opened / launched",
      "Getting first customers",
      "Running but sales are inconsistent",
      "Growing steadily",
      "Established and improving",
      "Expanding to new market or branch",
    ],
  },
  {
    id: "biz_offer",
    label: "What do you sell?",
    multiSelect: true,
    options: [
      "Food & beverage",
      "Physical products",
      "Customised gifts / products",
      "Personalised photo/name products",
      "Digital product",
      "SaaS / App subscription",
      "AI tool",
      "Professional service",
      "Personal service",
      "Healthcare / Wellness",
      "Real estate",
      "Course / Community",
      "Experience / Event",
      "Repair / Maintenance",
      "Other offer",
    ],
  },
  {
    id: "biz_audience",
    label: "Best customer",
    multiSelect: true,
    options: [
      "Students / Gen-Z",
      "Young professionals",
      "Parents & families",
      "Local office crowd",
      "Small business owners",
      "Founders / startup teams",
      "Enterprise buyers",
      "Developers / makers",
      "Premium buyers",
      "Mass market",
    ],
  },
  {
    id: "biz_challenge",
    label: "Biggest problem",
    multiSelect: true,
    options: [
      "Not getting enough leads or enquiries",
      "People don't understand the product",
      "Low brand awareness",
      "Poor social media growth",
      "Strong local competition",
      "People ask but don't buy",
      "Customers don't come back",
      "Hard to justify premium pricing",
      "Need first 100 users",
      "Need product-market fit",
    ],
  },
  {
    id: "biz_usp",
    label: "Main advantage",
    multiSelect: true,
    options: [
      "Better quality",
      "Better price / value",
      "Faster service",
      "More convenient",
      "Better customer care",
      "Niche expertise",
      "Local authenticity",
      "Unique product feature",
      "Founder-led trust",
      "AI-powered advantage",
    ],
  },
  {
    id: "biz_ticket",
    label: "Average order value",
    options: [
      "Under ₹200",
      "₹200-₹500",
      "₹500-₹2,000",
      "₹2,000-₹10,000",
      "₹10,000-₹50,000",
      "₹50,000+",
    ],
  },
  {
    id: "biz_revenue",
    label: "Monthly sales",
    options: [
      "Pre-revenue",
      "Below ₹50,000",
      "₹50K - ₹1 Lakh",
      "₹1 - ₹3 Lakh",
      "₹3 - ₹10 Lakh",
      "₹10 - ₹50 Lakh",
      "₹50 Lakh+",
    ],
  },
  {
    id: "biz_revenue_model",
    label: "How customers pay",
    options: [
      "One-time purchase",
      "Monthly subscription",
      "Pay per use",
      "Service fee",
      "UPI / cash / card / delivery apps",
      "Marketplace commission",
      "Sponsorship / ads",
      "Affiliate",
      "Mixed / Other",
    ],
  },
  {
    id: "biz_budget",
    label: "Marketing budget",
    options: [
      "Zero / Organic only",
      "Under ₹5,000",
      "₹5,000 - ₹15,000",
      "₹15,000 - ₹50,000",
      "₹50,000 - ₹2 Lakh",
      "₹2 Lakh+",
    ],
  },
  {
    id: "biz_team",
    label: "Team size",
    options: [
      "Just me",
      "2-5 people",
      "6-15 people",
      "16-50 people",
      "50+ people",
    ],
  },
  {
    id: "biz_followers",
    label: "Social following",
    options: [
      "Not active yet",
      "0 - 500",
      "500 - 2,000",
      "2,000 - 10,000",
      "10,000 - 50,000",
      "50,000+",
    ],
  },
  {
    id: "biz_personality",
    label: "Brand feel",
    multiSelect: true,
    options: [
      "Warm & friendly",
      "Gen-Z / meme-friendly",
      "Fun & playful",
      "Bold & confident",
      "Luxury / premium",
      "Professional & trustworthy",
      "Traditional & authentic",
      "Modern & minimal",
      "Raw founder voice",
      "Community-led",
      "Youthful street-style",
      "Calm wellness vibe",
    ],
  },
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function isMeaningfulText(value: string, minLength = 2) {
  const raw = value.trim();
  const lower = raw.toLowerCase();
  if (raw.length < minLength) return false;
  if (lowQualityValues.has(lower)) return false;
  if (/^(.)\1{2,}$/i.test(raw.replace(/\s+/g, ""))) return false;
  if (/(asdf|qwer|zxcv|dummy|fake business|lorem ipsum)/i.test(raw))
    return false;
  const letters = raw.match(/[a-z]/gi) || [];
  if (letters.length < Math.min(minLength, 3)) return false;
  if (
    letters.length >= 5 &&
    new Set(letters.map((char) => char.toLowerCase())).size <= 2
  )
    return false;
  return true;
}

function getUrlError(value: string) {
  if (!value.trim()) return "";
  const normalized = normalizeUrlInput(value);
  return normalized.ok ? "" : normalized.error;
}

function normalizeOptionalUrl(value: string) {
  if (!value.trim()) return "";
  const normalized = normalizeUrlInput(value);
  return normalized.ok ? normalized.url : value;
}

function optionParts(option: string | { value: string; label: string }) {
  return typeof option === "string" ? { value: option, label: option } : option;
}

function parseMultiValue(value: string) {
  return value
    .split(" | ")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatMultiValue(values: string[]) {
  return values.filter(Boolean).join(" | ");
}

async function readJsonResponse<T = Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const requestId =
    res.headers.get("cf-ray") || res.headers.get("x-request-id");
  const requestSuffix = requestId ? `, request ${requestId}` : "";
  const fallbackMessage = `Request failed (HTTP ${res.status}${requestSuffix}). Please wait a moment and try again.`;
  const responseText = await res.text();

  if (!responseText) {
    return { error: { message: fallbackMessage } } as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    return { error: { message: fallbackMessage } } as T;
  }
}

function extractStrategy(data: unknown): Record<string, StrategyValue> {
  if (data && typeof data === "object" && "report" in data) {
    const report = (data as { report?: unknown }).report;
    if (report && typeof report === "object" && !Array.isArray(report)) {
      return report as Record<string, StrategyValue>;
    }
  }

  if (data && typeof data === "object" && "strategy" in data) {
    const strategy = (data as { strategy?: unknown }).strategy;
    if (strategy && typeof strategy === "object" && !Array.isArray(strategy)) {
      return strategy as Record<string, StrategyValue>;
    }
  }

  const content = (
    data as { choices?: Array<{ message?: { content?: string } }> }
  )?.choices?.[0]?.message?.content;
  if (content) {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, StrategyValue>;
      }
    } catch {
      return { "Strategy Summary": content };
    }
  }

  return {};
}

function SnapshotSummary({
  title,
  snapshot,
}: {
  title: string;
  snapshot: WebSnapshot | null;
}) {
  if (!snapshot) return null;

  return (
    <div className="mt-2 border border-black/10 bg-black/[0.015] p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-1 text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/45">
        {title}
      </div>
      <p className="line-clamp-2 text-sm font-semibold text-black dark:text-white">
        {snapshot.title || snapshot.url}
      </p>
      {snapshot.detectedGaps.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-black/55 dark:text-white/50">
          {snapshot.detectedGaps.slice(0, 3).map((gap) => (
            <li key={gap}>- {gap}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function getIndustryDefaults(industry: string) {
  const lower = industry.toLowerCase();
  if (/cafe|restaurant|kitchen|bakery|catering|food/.test(lower)) {
    return {
      biz_type: "Local physical business",
      biz_customer_model: "Individual customers",
      biz_offer: "Food & beverage",
    };
  }
  if (
    /saas|software|developer|\bapp\b|mobile app|consumer app|\bai\b|ai app|ai tool|vibe/.test(
      lower,
    )
  ) {
    return {
      biz_type: "AI / Vibe-coded app",
      biz_customer_model: lower.includes("developer")
        ? "Developers / makers"
        : lower.includes("b2b")
          ? "Small business owners"
          : "App users",
      biz_offer: lower.includes("ai") ? "AI tool" : "SaaS / App subscription",
    };
  }
  if (
    /creator|media|newsletter|publication|podcast|youtube|influencer/.test(
      lower,
    )
  ) {
    return {
      biz_type: "Online only",
      biz_customer_model: "Creator / Media audience",
      biz_offer: "Course / Community",
    };
  }
  if (/custom|personal|gift|printing|merch|stationery|campus/.test(lower)) {
    return {
      biz_type: "Online + physical",
      biz_customer_model: "Individual customers",
      biz_offer: "Customised gifts / products",
    };
  }
  if (
    /e-commerce|d2c|retail|fashion|jewellery|grocery|electronics|decor|shop|store/.test(
      lower,
    )
  ) {
    return {
      biz_type:
        lower.includes("e-commerce") || lower.includes("d2c")
          ? "Online only"
          : "Local physical business",
      biz_customer_model: "Individual customers",
      biz_offer:
        lower.includes("e-commerce") || lower.includes("d2c")
          ? "E-commerce products"
          : "Retail products",
    };
  }
  if (/education|school|preschool|course|tuition|academy/.test(lower)) {
    return {
      biz_type: "Local physical business",
      biz_customer_model: "Individual customers",
      biz_offer: "Offline classes",
    };
  }
  if (
    /agency|consult|coaching|accounting|legal|interior|construction|photography|event/.test(
      lower,
    )
  ) {
    return {
      biz_type: "Service at customer location",
      biz_customer_model: "Small business owners",
      biz_offer: "Professional service",
    };
  }
  if (
    /salon|spa|gym|wellness|clinic|dental|healthcare|ayurveda|pet/.test(lower)
  ) {
    return {
      biz_type: "Local physical business",
      biz_customer_model: "Individual customers",
      biz_offer: "Personal service",
    };
  }
  return {};
}

function getOfferOptions(industry: string) {
  const lower = industry.toLowerCase();
  if (/cafe/.test(lower)) {
    return [
      "Coffee / Tea / Beverages",
      "Snacks / Desserts",
      "Work-from-cafe experience",
      "Breakfast / Brunch menu",
      "Premium coffee subscription",
      "Events / Open mic / Community nights",
      "Food & beverage",
    ];
  }
  if (/restaurant|kitchen|bakery|catering|food/.test(lower)) {
    return [
      "Dine-in meals",
      "Delivery food",
      "Signature dish / hero item",
      "Bakery / sweets",
      "Catering packages",
      "Family combos",
      "Food & beverage",
    ];
  }
  if (
    /saas|software|developer|\bapp\b|mobile app|consumer app|\bai\b|ai app|ai tool|vibe/.test(
      lower,
    )
  ) {
    return [
      "AI tool",
      "SaaS / App subscription",
      "Mobile app",
      "Chrome extension / plugin",
      "Developer tool",
      "One-time software product",
      "Template / automation pack",
      "Digital product",
    ];
  }
  if (
    /creator|media|newsletter|publication|podcast|youtube|influencer/.test(
      lower,
    )
  ) {
    return [
      "Newsletter / publication",
      "Podcast / video content",
      "Sponsorship / ads",
      "Paid community",
      "Course / Community",
      "Digital product",
      "Affiliate",
      "Consulting / Coaching",
    ];
  }
  if (/custom|personal|gift|printing|merch|stationery|campus/.test(lower)) {
    return [
      "Customised gifts / products",
      "Personalised photo/name products",
      "Giftable products",
      "College/campus gifts",
      "Printed merchandise",
      "Fashion / apparel",
      "Physical products",
    ];
  }
  if (
    /e-commerce|d2c|retail|fashion|jewellery|grocery|electronics|decor|shop|store/.test(
      lower,
    )
  ) {
    return [
      "Retail products",
      "E-commerce products",
      "Customised gifts / products",
      "Personalised photo/name products",
      "Fashion / apparel",
      "Jewellery / accessories",
      "Grocery / daily needs",
      "Electronics / gadgets",
      "Home decor / furniture",
      "Giftable products",
      "Physical products",
    ];
  }
  if (
    /salon|spa|gym|wellness|clinic|dental|healthcare|ayurveda|pet/.test(lower)
  ) {
    return [
      "Personal service",
      "Treatment package",
      "Membership / subscription",
      "Consultation",
      "Wellness program",
      "Transformation package",
      "Healthcare / Wellness",
    ];
  }
  if (/education|school|course/.test(lower)) {
    return [
      "Offline classes",
      "Online course",
      "Coaching program",
      "Workshop",
      "Community / cohort",
      "Course / Community",
    ];
  }
  if (/real estate|property/.test(lower)) {
    return [
      "Residential property",
      "Commercial property",
      "Plot / land",
      "Rental leads",
      "Property consultation",
      "Real estate",
    ];
  }
  if (/hotel|homestay|travel|event|photography/.test(lower)) {
    return [
      "Experience / Event",
      "Booking / reservation",
      "Package deal",
      "Premium service",
      "Professional service",
    ];
  }
  return [
    "Physical products",
    "Customised gifts / products",
    "Personalised photo/name products",
    "Digital product",
    "SaaS / App subscription",
    "AI tool",
    "Professional service",
    "Personal service",
    "Healthcare / Wellness",
    "Real estate",
    "Course / Community",
    "Experience / Event",
    "Repair / Maintenance",
    "Other offer",
  ];
}

function isPreLaunchForm(data: BusinessFormData) {
  const text = `${data.biz_stage} ${data.biz_age}`.toLowerCase();
  return /not launched|pre[-\s]?launch|before launch|launching soon/.test(text);
}

function shouldShowLocationFor(data: BusinessFormData) {
  return ![
    "Online only",
    "SaaS / Subscription app",
    "AI / Vibe-coded app",
  ].includes(data.biz_type);
}

function shouldHideField(fieldId: keyof BusinessFormData, preLaunch: boolean) {
  if (fieldId === "biz_age") return true;
  if (
    preLaunch &&
    (fieldId === "biz_revenue" || fieldId === "biz_revenue_model")
  )
    return true;
  return false;
}

function findBusinessDefaultRule(data: BusinessFormData) {
  const haystack = [
    data.biz_industry,
    data.biz_type,
    data.biz_offer,
    data.biz_audience,
    data.biz_challenge,
    data.biz_extra,
  ]
    .join(" ")
    .toLowerCase();

  let bestRule: BusinessDefaultRule | null = null;
  let bestScore = 0;

  for (const rule of businessDefaultRules) {
    const score = rule.match.reduce(
      (total, term) => total + (haystack.includes(term.toLowerCase()) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  return bestScore > 0 ? bestRule : null;
}

function applySmartDefaults(
  data: BusinessFormData,
  currentPlatforms: string[],
  currentGoals: string[],
) {
  const rule = findBusinessDefaultRule(data);
  if (!rule) {
    return {
      formData: data,
      platforms: currentPlatforms,
      goals: currentGoals,
      note: "",
      applied: false,
    };
  }

  const nextFormData = { ...data };
  const preLaunch = isPreLaunchForm(nextFormData);
  let changed = false;

  for (const [key, value] of Object.entries(rule.form_defaults) as Array<
    [keyof BusinessFormData, string]
  >) {
    if (key === "biz_revenue") continue;
    if (shouldHideField(key, preLaunch)) continue;
    if (!nextFormData[key].trim() && value) {
      nextFormData[key] = value;
      changed = true;
    }
  }

  const nextPlatforms =
    currentPlatforms.length === 0 ? rule.platforms : currentPlatforms;
  const nextGoals = currentGoals.length === 0 ? rule.goals : currentGoals;

  return {
    formData: nextFormData,
    platforms: nextPlatforms,
    goals: nextGoals,
    note: rule.note,
    applied:
      changed ||
      nextPlatforms !== currentPlatforms ||
      nextGoals !== currentGoals,
  };
}

function getBusinessRead({
  formData,
  showLocation,
}: {
  formData: BusinessFormData;
  showLocation: boolean;
}) {
  const industry = formData.biz_industry || "Unselected industry";
  const lower = industry.toLowerCase();
  const location = showLocation
    ? formData.biz_location || "local market"
    : "online/global market";

  if (/cafe|restaurant|kitchen|bakery|catering|food/.test(lower)) {
    return {
      title: "Local demand business",
      readsAs: `${industry} serving people in ${location}`,
      howItWorks:
        "People choose you by convenience, craving, trust, ambience, reviews, and repeat habit.",
      strategyBias:
        "This plan will focus on local discovery, repeat visits, WhatsApp/Instagram enquiries, reviews, and clear reasons to visit.",
    };
  }
  if (
    /saas|software|developer|\bapp\b|mobile app|consumer app|\bai\b|ai app|ai tool|vibe/.test(
      lower,
    )
  ) {
    return {
      title: "Digital product business",
      readsAs: `${industry} trying to get the right first users`,
      howItWorks:
        "People need to understand the use case fast, trust the product, and see one useful result quickly.",
      strategyBias:
        "This plan will focus on first users, demo clarity, trust, pricing, and simple ways to get people to try it.",
    };
  }
  if (
    /creator|media|newsletter|publication|podcast|youtube|influencer/.test(
      lower,
    )
  ) {
    return {
      title: "Audience-led media business",
      readsAs: `${industry} growing attention, trust, monetization, and repeat consumption`,
      howItWorks:
        "People subscribe when the point of view is clear, the content promise is consistent, and the audience feels seen.",
      strategyBias:
        "This plan will focus on a clear content promise, repeat watching/reading, sponsor value, and community trust.",
    };
  }
  if (
    /e-commerce|d2c|retail|fashion|jewellery|grocery|electronics|decor/.test(
      lower,
    )
  ) {
    return {
      title: "Product commerce business",
      readsAs: `${industry} selling products through store, online, or both`,
      howItWorks:
        "People buy through product appeal, trust, price-value, offers, availability, and repeat purchase triggers.",
      strategyBias:
        "This plan will focus on hero products, clear ordering, local/store traffic, real product proof, and faster replies.",
    };
  }
  if (
    /agency|consult|coaching|accounting|legal|interior|construction/.test(lower)
  ) {
    return {
      title: "Trust-led service business",
      readsAs: `${industry} where buyers need proof before enquiry`,
      howItWorks:
        "People enquire when the outcome feels clear, credible, low-risk, and worth the consultation.",
      strategyBias:
        "This plan will focus on proof, clear packages, useful first contact, and better follow-up.",
    };
  }
  return {
    title: "Business model read",
    readsAs: `${industry} in ${location}`,
    howItWorks:
      "The plan uses your model, offer, audience, stage, and live signals to choose the most useful ideas.",
    strategyBias: "More specific inputs produce a sharper, less generic plan.",
  };
}

function SmartBusinessRead({
  formData,
  showLocation,
}: {
  formData: BusinessFormData;
  showLocation: boolean;
}) {
  const read = getBusinessRead({ formData, showLocation });
  return (
    <section className="border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--color-brand-accent)]" />
        <h2 className="font-display text-lg font-semibold">{read.title}</h2>
      </div>
      <div className="space-y-3 text-xs leading-5 text-black/55 dark:text-white/50">
        <p>
          <span className="font-semibold text-black dark:text-white">
            This reads as:
          </span>{" "}
          {read.readsAs}
        </p>
        <p>
          <span className="font-semibold text-black dark:text-white">
            How it works:
          </span>{" "}
          {read.howItWorks}
        </p>
        <p>
          <span className="font-semibold text-black dark:text-white">
            This plan will focus on:
          </span>{" "}
          {read.strategyBias}
        </p>
      </div>
    </section>
  );
}

function CheckRow({
  ok,
  label,
  muted = false,
}: {
  ok: boolean;
  label: string;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${muted ? "opacity-45" : ""}`}>
      {!muted && ok ? (
        <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <span
          className="h-3.5 w-3.5 rounded-full border border-black/30 dark:border-white/30"
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </div>
  );
}

export default function DetailsPage() {
  const { data: session, isPending } = useSession();
  const [localDev, setLocalDev] = useState<LocalDevSession>({
    enabled: false,
    session: null,
  });
  const [formData, setFormData] = useState<BusinessFormData>(initialFormData);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSuggestion | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [webIntel, setWebIntel] = useState<{
    own: WebSnapshot | null;
    competitor: WebSnapshot | null;
  }>({ own: null, competitor: null });
  const [webScanning, setWebScanning] = useState<"own" | "competitor" | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [smartDefaultNotice, setSmartDefaultNotice] = useState<string | null>(
    null,
  );
  const [resultData, setResultData] = useState<GenerationResult | null>(null);
  const [enrichingReportId, setEnrichingReportId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("form");
  const [lastPayload, setLastPayload] = useState<BusinessPayload | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const activeUser = session?.user || localDev.session?.user;
  const isSignedIn = Boolean(activeUser);
  const showLocation = shouldShowLocationFor(formData);
  const preLaunch = isPreLaunchForm(formData);
  const coreFields = selectFields
    .slice(0, 4)
    .filter((field) => !shouldHideField(field.id, preLaunch));
  const offerFields = selectFields
    .slice(4, 12)
    .filter((field) => !shouldHideField(field.id, preLaunch));
  const scaleFields = selectFields
    .slice(12)
    .filter((field) => !shouldHideField(field.id, preLaunch));

  const refreshReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) return;
      const data = (await res.json()) as { reports?: ReportSummary[] };
      setReports(data.reports || []);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadLocalSession = () => {
      void fetch("/api/dev-session")
        .then((res) => res.json())
        .then((data: LocalDevSession) => setLocalDev(data))
        .catch(() => setLocalDev({ enabled: false, session: null }))
        .finally(() => setAuthChecked(true));
    };

    loadLocalSession();
    window.addEventListener("cac-local-auth-changed", loadLocalSession);
    return () =>
      window.removeEventListener("cac-local-auth-changed", loadLocalSession);
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    const timeoutId = window.setTimeout(() => {
      void refreshReports();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isSignedIn, refreshReports]);

  useEffect(() => {
    if (!isLoading) return;
    const interval = window.setInterval(() => {
      setLoadingStep((step) => Math.min(step + 1, loadingSteps.length));
    }, 800);
    return () => window.clearInterval(interval);
  }, [isLoading]);

  // The plan on screen is the fast one. The server is still rewriting its copy
  // with AI and saving over the same report, so watch for the better version and
  // swap it in underneath the reader. If it never arrives - the AI was down, or
  // the platform cut the background work short - the plan they already have
  // stays exactly as it is, so this gives up quietly rather than warning them
  // about something that did not cost them anything.
  useEffect(() => {
    if (!enrichingReportId) return;
    const MAX_ATTEMPTS = 24;
    const EVERY_MS = 5000;
    let attempts = 0;
    let cancelled = false;

    const stop = () => {
      cancelled = true;
      window.clearInterval(interval);
      setEnrichingReportId(null);
    };

    const poll = async () => {
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) {
        setResultData((current) =>
          current?.aiEnrichment === "running"
            ? { ...current, aiEnrichment: "failed" }
            : current,
        );
        stop();
        return;
      }
      try {
        const res = await fetch(`/api/reports/${enrichingReportId}`);
        if (!res.ok) return;
        const data = await readJsonResponse<{
          report?: { strategy_json?: string | Record<string, StrategyValue> };
        }>(res);
        const raw = data.report?.strategy_json;
        if (!raw) return;
        const strategy = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<
          string,
          StrategyValue
        >;
        const meta = strategy.meta as { enrichment_status?: string } | undefined;
        const status = meta?.enrichment_status;
        if (status !== "ready" && status !== "failed") return;
        if (cancelled) return;
        setResultData((current) =>
          current
            ? {
                ...current,
                strategy: status === "ready" ? strategy : current.strategy,
                aiEnrichment: status,
              }
            : current,
        );
        stop();
      } catch {
        // A dropped poll is not worth surfacing; the next tick tries again.
      }
    };

    const interval = window.setInterval(() => {
      void poll();
    }, EVERY_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enrichingReportId]);

  useEffect(() => {
    const query = formData.biz_location.trim();
    if (!showLocation || query.length < 2) return;
    if (selectedLocation) {
      const selectedLabel =
        [
          selectedLocation.city,
          selectedLocation.state,
          selectedLocation.country,
        ]
          .filter(Boolean)
          .join(", ") || selectedLocation.displayName;
      if (query === selectedLabel) return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void fetch(`/api/location-insights?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data: { suggestions?: LocationSuggestion[] }) => {
          if (!cancelled) setLocationSuggestions(data.suggestions || []);
        })
        .catch(() => {
          if (!cancelled) setLocationSuggestions([]);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [formData.biz_location, selectedLocation, showLocation]);

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { id, value } = event.target;
    setSmartDefaultNotice(null);
    setFormData((prev) => {
      if (id !== "biz_industry") return { ...prev, [id]: value };

      const defaults = getIndustryDefaults(value);
      return {
        ...prev,
        biz_industry: value,
        biz_offer: defaults.biz_offer || "",
        biz_type: defaults.biz_type || prev.biz_type || "",
        biz_customer_model:
          defaults.biz_customer_model || prev.biz_customer_model || "",
      };
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      if (id === "biz_industry") {
        delete next.biz_offer;
        delete next.biz_type;
        delete next.biz_customer_model;
      }
      return next;
    });

    if (id === "biz_location") {
      setSelectedLocation(null);
      if (value.trim().length < 2) setLocationSuggestions([]);
    }

    if (id === "biz_website") setWebIntel((prev) => ({ ...prev, own: null }));
    if (id === "biz_comp_website")
      setWebIntel((prev) => ({ ...prev, competitor: null }));
  };

  const toggleMultiField = (id: keyof BusinessFormData, value: string) => {
    setSmartDefaultNotice(null);
    setFormData((prev) => {
      const selected = parseMultiValue(prev[id]);
      const nextSelected = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      return { ...prev, [id]: formatMultiValue(nextSelected) };
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) => {
      if (prev.includes(platform))
        return prev.filter((item) => item !== platform);
      if (platform === "None yet") return ["None yet"];
      return [...prev.filter((item) => item !== "None yet"), platform];
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.platforms;
      return next;
    });
  };

  const toggleGoal = (goal: string) => {
    setGoals((prev) =>
      prev.includes(goal)
        ? prev.filter((item) => item !== goal)
        : [...prev, goal],
    );
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.goals;
      return next;
    });
  };

  const selectLocation = (suggestion: LocationSuggestion) => {
    const label =
      [suggestion.city, suggestion.state, suggestion.country]
        .filter(Boolean)
        .join(", ") || suggestion.displayName;
    setSelectedLocation(suggestion);
    setFormData((prev) => ({ ...prev, biz_location: label }));
    setLocationSuggestions([]);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.biz_location;
      return next;
    });
  };

  const validate = (
    currentFormData: BusinessFormData,
    currentPlatforms = platforms,
    currentGoals = goals,
  ) => {
    const errors: Record<string, string> = {};
    const isPreLaunch = isPreLaunchForm(currentFormData);
    const currentShowLocation = shouldShowLocationFor(currentFormData);
    for (const field of requiredFields) {
      if (!currentShowLocation && field === "biz_location") continue;
      if (shouldHideField(field, isPreLaunch)) continue;
      if (field === "biz_name" || field === "biz_location") {
        if (
          !isMeaningfulText(
            currentFormData[field],
            field === "biz_location" ? 3 : 2,
          )
        ) {
          errors[field] = "Add a real answer.";
        }
        continue;
      }

      if (!currentFormData[field].trim()) {
        errors[field] = "Add a real answer.";
      }
    }
    if (currentGoals.length === 0) errors.goals = "Choose at least one goal.";
    if (currentPlatforms.length === 0)
      errors.platforms = "Choose at least one platform.";
    const websiteError = getUrlError(currentFormData.biz_website);
    const competitorError = getUrlError(currentFormData.biz_comp_website);
    if (websiteError) errors.biz_website = websiteError;
    if (competitorError) errors.biz_comp_website = competitorError;
    return errors;
  };

  const buildBizPayload = (
    sourceFormData = formData,
    sourcePlatforms = platforms,
    sourceGoals = goals,
    sourceWebIntel = webIntel,
  ): BusinessPayload => {
    const currentFormData = {
      ...sourceFormData,
      biz_website: normalizeOptionalUrl(sourceFormData.biz_website),
      biz_comp_website: normalizeOptionalUrl(sourceFormData.biz_comp_website),
    };
    const currentShowLocation = shouldShowLocationFor(currentFormData);
    if (!currentShowLocation) {
      currentFormData.biz_location = "Online / Global";
    }
    if (isPreLaunchForm(currentFormData)) {
      currentFormData.biz_revenue = "Not needed before launch";
      currentFormData.biz_revenue_model = "Not needed before launch";
      currentFormData.biz_age = "Pre-launch";
    } else {
      currentFormData.biz_age = "";
    }

    return {
      ...currentFormData,
      platforms: sourcePlatforms,
      goal: sourceGoals,
      location_insight: currentShowLocation ? selectedLocation : null,
      own_website_snapshot: sourceWebIntel.own,
      competitor_website_snapshot: sourceWebIntel.competitor,
    };
  };

  const loginWithTester = async () => {
    const response = await fetch("/api/dev-login", { method: "POST" });
    if (!response.ok) return false;
    const data = await readJsonResponse<{
      user?: NonNullable<LocalDevSession["session"]>["user"];
    }>(response);
    if (!data.user) return false;
    setLocalDev({ enabled: true, session: { user: data.user } });
    window.dispatchEvent(new Event("cac-local-auth-changed"));
    return true;
  };

  const handlePageSignIn = async () => {
    setAuthError(null);
    setGlobalError(null);

    if (localDev.enabled) {
      const ok = await loginWithTester();
      if (!ok)
        setAuthError(
          "Tester login is enabled, but the server rejected it. Refresh and try again.",
        );
      return;
    }

    try {
      const result = await signIn.social({
        provider: "google",
        callbackURL: "/details/",
      });
      const error = (result as { error?: { message?: string } } | undefined)
        ?.error;
      if (error) {
        setAuthError(
          error.message || "Google sign-in is not configured for this preview.",
        );
      } else {
        setAuthError(
          "Google sign-in did not redirect. Check the Google OAuth callback URL for this Cloudflare preview.",
        );
      }
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Google sign-in failed. Please try again.",
      );
    }
  };

  const ensureSignedIn = async () => {
    if (isSignedIn) return true;

    if (localDev.enabled) {
      const ok = await loginWithTester();
      if (!ok)
        setGlobalError(
          "Please sign in before building a plan. Tester login is enabled, but the server rejected it.",
        );
      return ok;
    }

    setGlobalError("Please sign in before building a plan.");
    try {
      const result = await signIn.social({
        provider: "google",
        callbackURL: "/details/",
      });
      const error = (result as { error?: { message?: string } } | undefined)
        ?.error;
      if (error)
        setGlobalError(
          error.message || "Google sign-in is not configured for this preview.",
        );
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : "Google sign-in failed. Please try again.",
      );
    }
    return false;
  };

  const runWebScan = useCallback(
    async (kind: "own" | "competitor", url: string, silent = false) => {
      if (!url.trim()) return null;
      const normalized = normalizeUrlInput(url);
      if (!normalized.ok) {
        if (!silent)
          setFieldErrors((prev) => ({
            ...prev,
            [kind === "own" ? "biz_website" : "biz_comp_website"]:
              normalized.error,
          }));
        return null;
      }

      setFormData((prev) => ({
        ...prev,
        [kind === "own" ? "biz_website" : "biz_comp_website"]: normalized.url,
      }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[kind === "own" ? "biz_website" : "biz_comp_website"];
        return next;
      });
      setWebScanning(kind);
      try {
        const res = await fetch("/api/web-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: normalized.url, kind }),
        });
        const data = await readJsonResponse<{
          error?: { message?: string };
          snapshot?: WebSnapshot;
        }>(res);
        if (!res.ok)
          throw new Error(data?.error?.message || "Failed to scan website.");

        const snapshot = data.snapshot as WebSnapshot;
        if (!snapshot)
          throw new Error("Website scan did not return a snapshot.");
        setWebIntel((prev) => ({ ...prev, [kind]: snapshot }));
        return snapshot;
      } catch (error: unknown) {
        if (!silent) setGlobalError(getErrorMessage(error));
        return null;
      } finally {
        setWebScanning(null);
      }
    },
    [],
  );

  const saveReport = async (
    strategy: Record<string, StrategyValue>,
    payload: BusinessPayload,
  ) => {
    const res = await fetch("/api/reports/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bizName: payload.biz_name,
        bizType: payload.biz_industry,
        location: payload.biz_location,
        website: payload.biz_website,
        data: strategy,
      }),
    });

    if (!res.ok) return null;
    const data = await readJsonResponse<{ id?: string }>(res);
    return data.id || null;
  };

  const generateStrategy = async () => {
    const signedIn = await ensureSignedIn();
    if (!signedIn) return;

    const withDefaults = applySmartDefaults(formData, platforms, goals);
    if (withDefaults.applied) {
      setFormData(withDefaults.formData);
      setPlatforms(withDefaults.platforms);
      setGoals(withDefaults.goals);
      setSmartDefaultNotice(
        withDefaults.note ||
          "We filled a few common details. You can change them.",
      );
    } else {
      setSmartDefaultNotice(null);
    }

    const errors = validate(
      withDefaults.formData,
      withDefaults.platforms,
      withDefaults.goals,
    );
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGlobalError(
        "A few answers still need attention. We highlighted them below.",
      );
      return;
    }

    setFieldErrors({});
    setGlobalError(null);
    setResultData(null);
    setLastPayload(null);
    setLoadingStep(1);
    setIsLoading(true);
    setViewMode("loading");

    try {
      const ownSnapshot = withDefaults.formData.biz_website
        ? await runWebScan("own", withDefaults.formData.biz_website, true)
        : webIntel.own;
      const competitorSnapshot = withDefaults.formData.biz_comp_website
        ? await runWebScan(
            "competitor",
            withDefaults.formData.biz_comp_website,
            true,
          )
        : webIntel.competitor;
      const currentWebIntel = {
        own: ownSnapshot,
        competitor: competitorSnapshot,
      };
      const payload = {
        ...buildBizPayload(
          withDefaults.formData,
          withDefaults.platforms,
          withDefaults.goals,
          currentWebIntel,
        ),
        own_website_snapshot: ownSnapshot,
        competitor_website_snapshot: competitorSnapshot,
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useHybrid: true,
          responseMode: "workspace_v1",
          biz: payload,
        }),
      });

      const data = await readJsonResponse<{
        error?: {
          message?: string;
          fields?: Array<{ field: string; message: string }>;
        };
        confidence?: GenerationResult["confidence"];
        telemetry?: GenerationResult["telemetry"];
        generatedAt?: string;
        savedReportId?: string;
        workspaceId?: string;
        aiEnrichment?: { status?: string; reportId?: string };
      }>(res);
      if (!res.ok) {
        const serverFields = data?.error?.fields as
          Array<{ field: string; message: string }> | undefined;
        if (serverFields?.length) {
          setFieldErrors(
            Object.fromEntries(
              serverFields.map((item) => [item.field, item.message]),
            ),
          );
        }
        throw new Error(
          data?.error?.message ||
            "Failed to build your plan. Please try again.",
        );
      }

      const strategy = extractStrategy(data);
      const savedReportId =
        data.savedReportId ||
        data.workspaceId ||
        (await saveReport(strategy, payload).catch(() => null));
      setLastPayload(payload);
      const enrichmentRunning = data.aiEnrichment?.status === "running";
      setResultData({
        strategy,
        confidence: data.confidence,
        telemetry: data.telemetry,
        generatedAt: data.generatedAt,
        savedReportId: savedReportId || undefined,
        aiEnrichment: enrichmentRunning ? "running" : "skipped",
      });
      setViewMode("report");
      if (enrichmentRunning && savedReportId) setEnrichingReportId(savedReportId);
      await refreshReports();
    } catch (error: unknown) {
      setViewMode("form");
      setGlobalError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const loadReport = async (id: string) => {
    setGlobalError(null);
    try {
      const res = await fetch(`/api/reports/${id}`);
      const data = await readJsonResponse<{
        error?: string;
        report?: {
          strategy_json?: string | Record<string, StrategyValue>;
          created_at?: string;
        };
      }>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to load report.");

      const strategyJson = data.report?.strategy_json;
      const strategy =
        typeof strategyJson === "string"
          ? JSON.parse(strategyJson)
          : strategyJson;
      setEnrichingReportId(null);
      setResultData({
        strategy,
        savedReportId: id,
        generatedAt: data.report?.created_at,
      });
      setViewMode("report");
    } catch (error: unknown) {
      setGlobalError(getErrorMessage(error));
    }
  };

  const printCurrentStrategy = () => {
    if (!resultData || typeof window === "undefined") return;
    const previousTitle = document.title;
    document.title = `${lastPayload?.biz_name || formData.biz_name || "CAC Strategy"} - CAC Report`;
    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 250);
  };

  const getInputClass = (id: string) => {
    const isError = Boolean(fieldErrors[id]);
    return `w-full bg-black/[0.02] dark:bg-[#101010] border ${
      isError
        ? "border-red-500 dark:border-red-500"
        : "border-black/10 dark:border-white/10"
    } rounded-sm px-3 py-2 text-black dark:text-white text-sm outline-none transition-all placeholder:text-black/30 dark:placeholder:text-white/20 focus:border-[var(--color-brand-accent)] focus:ring-1 focus:ring-[var(--color-brand-accent)]/20`;
  };

  const labelBase =
    "block text-black/60 dark:text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-1";

  const renderField = (field: SelectField) => {
    const currentField =
      field.id === "biz_offer"
        ? { ...field, options: getOfferOptions(formData.biz_industry) }
        : field;
    return currentField.multiSelect ? (
      <MultiSelectControl
        key={currentField.id}
        field={currentField}
        value={formData[currentField.id]}
        labelClass={labelBase}
        error={fieldErrors[currentField.id]}
        onToggle={toggleMultiField}
      />
    ) : (
      <SelectControl
        key={currentField.id}
        field={currentField}
        value={formData[currentField.id]}
        className={getInputClass(currentField.id)}
        labelClass={labelBase}
        error={fieldErrors[currentField.id]}
        onChange={handleChange}
      />
    );
  };

  const resetToForm = () => {
    setViewMode("form");
    setResultData(null);
  };

  return (
    <>
      <Navbar />
      <main
        id="main-content"
        className="min-h-screen bg-white pt-16 text-black transition-colors dark:bg-[#020202] dark:text-white"
      >
        {viewMode === "loading" && (
          <StrategyLoadingScreen
            businessName={formData.biz_name || "your business"}
            loadingStep={loadingStep}
          />
        )}

        {viewMode === "report" && resultData && (
          <>
            {resultData.aiEnrichment === "running" && (
              <div className="mx-auto mt-4 flex max-w-7xl items-start gap-3 border border-[var(--color-brand-accent)]/35 bg-[var(--color-brand-accent)]/10 px-4 py-3 text-sm font-medium text-black/70 sm:px-6 lg:px-8 dark:text-white/75">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-[var(--color-brand-accent)]" />
                Your plan is ready to use. We are still improving the wording — it
                will update here on its own in a moment.
              </div>
            )}
            <StrategyWorkspace
              result={resultData}
              payload={lastPayload}
              onBack={resetToForm}
              onPrint={printCurrentStrategy}
            />
          </>
        )}

        {viewMode === "form" && (isPending || !authChecked) && (
          <AuthGateLoading />
        )}

        {viewMode === "form" && !isPending && authChecked && !isSignedIn && (
          <SignInRequiredScreen
            authError={authError}
            testerEnabled={localDev.enabled}
            onSignIn={() => void handlePageSignIn()}
          />
        )}

        {viewMode === "form" && !isPending && authChecked && isSignedIn && (
          <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-3 border-b border-black/10 pb-5 dark:border-white/10 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-[var(--color-brand-accent)]">
                  Plan Builder
                </div>
                <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                  Build a Sharp Business Brief
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-black/55 dark:text-white/50">
                  Short form, real details, local signals. Beta is free for
                  testers. Future paid plan is ₹799 every 31 days.
                </p>
              </div>
            </div>

            {globalError && (
              <div className="mb-4 flex items-start gap-3 border border-red-500/30 bg-red-500/10 p-3 text-sm font-medium text-red-600 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {globalError}
              </div>
            )}

            {smartDefaultNotice && (
              <div className="mb-4 flex items-start gap-3 border border-[var(--color-brand-accent)]/35 bg-[var(--color-brand-accent)]/10 p-3 text-sm font-medium text-black/70 dark:text-white/75">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand-accent)]" />
                {smartDefaultNotice}
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <section>
                  <SectionTitle eyebrow="1" title="Business core" />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <TextControl
                      id="biz_name"
                      label="Business name"
                      placeholder="e.g. Urban Brew Calicut"
                      value={formData.biz_name}
                      className={getInputClass("biz_name")}
                      labelClass={labelBase}
                      error={fieldErrors.biz_name}
                      onChange={handleChange}
                    />
                    {coreFields.map(renderField)}
                    {showLocation && (
                      <div className="relative">
                        <TextControl
                          id="biz_location"
                          label="City / market"
                          placeholder="Start typing: Kozhikode, Kerala"
                          value={formData.biz_location}
                          className={getInputClass("biz_location")}
                          labelClass={labelBase}
                          error={fieldErrors.biz_location}
                          onChange={handleChange}
                        />
                        {locationSuggestions.length > 0 && (
                          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-[#080808]">
                            {locationSuggestions.map((suggestion) => (
                              <button
                                type="button"
                                key={`${suggestion.displayName}-${suggestion.lat}`}
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  selectLocation(suggestion);
                                }}
                                className="flex w-full gap-2 border-b border-black/5 px-3 py-2 text-left text-sm hover:bg-black/[0.03] dark:border-white/5 dark:hover:bg-white/[0.04]"
                              >
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand-accent)]" />
                                <span>
                                  <span className="block font-semibold">
                                    {[suggestion.city, suggestion.state]
                                      .filter(Boolean)
                                      .join(", ") || suggestion.displayName}
                                  </span>
                                  <span className="line-clamp-1 text-xs text-black/45 dark:text-white/40">
                                    {suggestion.displayName}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <SectionTitle eyebrow="2" title="Offer and market" />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {offerFields.map(renderField)}
                  </div>
                </section>

                <section>
                  <SectionTitle eyebrow="3" title="Scale and channels" />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {scaleFields.map(renderField)}
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <ToggleGroup
                      title="Platforms"
                      error={fieldErrors.platforms}
                    >
                      {platformOptions.map((platform) => (
                        <ToggleButton
                          key={platform}
                          label={platform}
                          active={platforms.includes(platform)}
                          onClick={() => togglePlatform(platform)}
                        />
                      ))}
                    </ToggleGroup>

                    <ToggleGroup title="Goals" error={fieldErrors.goals}>
                      {goalOptions.map((goal) => (
                        <ToggleButton
                          key={goal.id}
                          label={goal.name}
                          active={goals.includes(goal.id)}
                          onClick={() => toggleGoal(goal.id)}
                        />
                      ))}
                    </ToggleGroup>
                  </div>
                </section>

                <section>
                  <SectionTitle eyebrow="4" title="Live web signals" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="flex gap-2">
                        <TextControl
                          id="biz_website"
                          label="Your website"
                          placeholder="https://yourbusiness.com"
                          value={formData.biz_website}
                          className={getInputClass("biz_website")}
                          labelClass={labelBase}
                          error={fieldErrors.biz_website}
                          required={false}
                          onChange={handleChange}
                        />
                        <ScanButton
                          loading={webScanning === "own"}
                          onClick={() =>
                            void runWebScan("own", formData.biz_website)
                          }
                        />
                      </div>
                      <SnapshotSummary
                        title="Own site scan"
                        snapshot={webIntel.own}
                      />
                    </div>
                    <div>
                      <div className="flex gap-2">
                        <TextControl
                          id="biz_comp_website"
                          label="Competitor website"
                          placeholder="https://competitor.com"
                          value={formData.biz_comp_website}
                          className={getInputClass("biz_comp_website")}
                          labelClass={labelBase}
                          error={fieldErrors.biz_comp_website}
                          required={false}
                          onChange={handleChange}
                        />
                        <ScanButton
                          loading={webScanning === "competitor"}
                          onClick={() =>
                            void runWebScan(
                              "competitor",
                              formData.biz_comp_website,
                            )
                          }
                        />
                      </div>
                      <SnapshotSummary
                        title="Competitor scan"
                        snapshot={webIntel.competitor}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="biz_extra" className={labelBase}>
                        Extra context
                      </label>
                      <textarea
                        id="biz_extra"
                        placeholder="Anything important: best sellers, seasonality, weak competitors, founder story, launch deadline..."
                        onChange={handleChange}
                        value={formData.biz_extra}
                        className={`${getInputClass("biz_extra")} min-h-[74px] resize-y`}
                      />
                    </div>
                  </div>
                </section>

                <div className="flex flex-col items-start justify-between gap-3 border-y border-black/10 py-4 dark:border-white/10 md:flex-row md:items-center">
                  <span className="text-xs leading-5 text-black/45 dark:text-white/40">
                    The main plan comes from the business library. AI is
                    reserved for website roast, captions, hashtags, and web
                    scans.
                  </span>
                  <button
                    type="button"
                    onClick={generateStrategy}
                    disabled={isLoading || isPending}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[var(--color-brand-accent)] px-7 py-3.5 text-base font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto whitespace-nowrap"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Sparkles className="h-5 w-5" />
                    )}
                    {!isSignedIn
                      ? "Continue and Build Plan"
                      : isLoading
                        ? "Building..."
                        : "Build My Plan"}
                  </button>
                </div>
              </div>

              <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
                <section className="border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[var(--color-brand-accent)]" />
                    <h2 className="font-display text-lg font-semibold">
                      Quality Checks
                    </h2>
                  </div>
                  <div className="space-y-2 text-xs text-black/55 dark:text-white/50">
                    <CheckRow
                      ok={isMeaningfulText(formData.biz_name)}
                      label="Real business name"
                    />
                    <CheckRow
                      ok={
                        !showLocation ||
                        isMeaningfulText(formData.biz_location, 3)
                      }
                      label="Living location"
                    />
                    <CheckRow ok={goals.length > 0} label="Clear goal" />
                    <CheckRow
                      ok={platforms.length > 0}
                      label="Channels selected"
                    />
                    <CheckRow
                      ok={!formData.biz_website || Boolean(webIntel.own)}
                      label="Own site scanned"
                      muted={!formData.biz_website}
                    />
                    <CheckRow
                      ok={
                        !formData.biz_comp_website ||
                        Boolean(webIntel.competitor)
                      }
                      label="Competitor scanned"
                      muted={!formData.biz_comp_website}
                    />
                  </div>
                </section>

                {selectedLocation && (
                  <section className="border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[var(--color-brand-accent)]" />
                      <h2 className="font-display text-lg font-semibold">
                        Local Anchor
                      </h2>
                    </div>
                    <p className="text-sm font-semibold">
                      {[selectedLocation.city, selectedLocation.state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-black/50 dark:text-white/45">
                      {selectedLocation.country}
                    </p>
                  </section>
                )}

                <SmartBusinessRead
                  formData={formData}
                  showLocation={showLocation}
                />

                <section className="border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold">
                      Report History
                    </h2>
                    <FileClock className="h-4 w-4 text-black/40 dark:text-white/40" />
                  </div>
                  {!isSignedIn ? (
                    <p className="text-sm text-black/55 dark:text-white/50">
                      Continue as tester to save and reload reports.
                    </p>
                  ) : reportsLoading ? (
                    <p className="text-sm text-black/55 dark:text-white/50">
                      Loading reports...
                    </p>
                  ) : reports.length === 0 ? (
                    <p className="text-sm text-black/55 dark:text-white/50">
                      No reports yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {reports.map((report) => (
                        <button
                          key={report.id}
                          type="button"
                          onClick={() => loadReport(report.id)}
                          className="block w-full border border-black/10 p-3 text-left transition hover:border-[var(--color-brand-accent)] dark:border-white/10"
                        >
                          <div className="truncate text-sm font-semibold">
                            {report.business_name || "Untitled Strategy"}
                          </div>
                          <div className="mt-1 text-xs text-black/45 dark:text-white/40">
                            {report.business_type || "Business"} ·{" "}
                            {new Date(report.created_at).toLocaleDateString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </aside>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function AuthGateLoading() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <Loader2 className="mb-4 h-6 w-6 animate-spin text-[var(--color-brand-accent)]" />
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Checking access
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-black/55 dark:text-white/50">
        We are checking whether tester login is available for this preview.
      </p>
    </div>
  );
}

function SignInRequiredScreen({
  authError,
  testerEnabled,
  onSignIn,
}: {
  authError: string | null;
  testerEnabled: boolean;
  onSignIn: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.04]">
        <ShieldCheck className="h-5 w-5 text-[var(--color-brand-accent)]" />
      </div>
      <div className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-[var(--color-brand-accent)]">
        Sign in required
      </div>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Sign in to build your plan
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-6 text-black/55 dark:text-white/50">
        The strategy builder saves reports and uses protected backend checks, so
        access is required before the form opens.
      </p>
      {authError && (
        <div className="mt-5 flex max-w-lg items-start gap-3 border border-red-500/30 bg-red-500/10 p-3 text-left text-sm font-medium text-red-600 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {authError}
        </div>
      )}
      <button
        type="button"
        onClick={onSignIn}
        className="mt-7 inline-flex items-center justify-center rounded-sm bg-[var(--color-brand-accent)] px-7 py-3.5 text-base font-bold text-black transition hover:brightness-110"
      >
        {testerEnabled ? "Continue as Tester" : "Sign in with Google"}
      </button>
    </div>
  );
}

function StrategyLoadingScreen({
  businessName,
  loadingStep,
}: {
  businessName: string;
  loadingStep: number;
}) {
  return (
    <div
      className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8"
      role="status"
      aria-live="polite"
    >
      <div className="mb-8 font-mono text-xs font-bold uppercase tracking-widest text-[var(--color-brand-accent)]">
        Plan builder running
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
        <div>
          <h1 className="font-display text-5xl font-bold leading-none tracking-tight md:text-7xl">
            Building a clear business plan for{" "}
            <span className="text-[var(--color-brand-accent)]">
              {businessName}
            </span>
            .
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-black/55 dark:text-white/50">
            We are matching your brief with the business library, live signals,
            local context, and a 30-day post plan.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-px border border-black/10 bg-black/10 dark:border-white/10 dark:bg-white/10 md:grid-cols-4">
            {[
              "Research",
              "Other shops",
              "Customer questions",
              "Open chances",
              "Post plan",
              "Captions",
              "Ad result",
              "Full plan",
            ].map((label, index) => (
              <div
                key={label}
                className={`bg-white p-4 text-sm font-semibold transition dark:bg-[#050505] ${index <= loadingStep ? "text-[var(--color-brand-accent)]" : "text-black/35 dark:text-white/30"}`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="border border-black/10 bg-black/[0.015] p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-5 flex items-center justify-between">
            <span className="font-display text-xl font-semibold">
              Building your plan
            </span>
            <Loader2 className="h-5 w-5 animate-spin text-[var(--color-brand-accent)]" />
          </div>
          <div className="space-y-3">
            {loadingSteps.map((step, index) => (
              <div key={step} className="flex gap-3">
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${loadingStep > index ? "bg-[var(--color-brand-accent)]" : "bg-black/15 dark:bg-white/15"}`}
                />
                <span
                  className={`text-sm ${loadingStep > index ? "text-black dark:text-white" : "text-black/40 dark:text-white/35"}`}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 h-1 overflow-hidden bg-black/10 dark:bg-white/10">
            <div className="h-full w-2/3 animate-pulse bg-[var(--color-brand-accent)]" />
          </div>
          <p className="mt-4 text-xs leading-5 text-black/45 dark:text-white/40">
            This wait is intentional. The plan is being assembled into a clean,
            readable format instead of appearing like a quick placeholder.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs font-bold text-white dark:bg-white dark:text-black">
        {eyebrow}
      </span>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
    </div>
  );
}

function TextControl({
  id,
  label,
  placeholder,
  value,
  className,
  labelClass,
  error,
  required = true,
  onChange,
}: {
  id: keyof BusinessFormData;
  label: string;
  placeholder: string;
  value: string;
  className: string;
  labelClass: string;
  error?: string;
  required?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

function SelectControl({
  field,
  value,
  className,
  labelClass,
  error,
  onChange,
}: {
  field: (typeof selectFields)[number];
  value: string;
  className: string;
  labelClass: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div>
      <label htmlFor={field.id} className={labelClass}>
        {field.label}
        {field.optional ? "" : " *"}
      </label>
      <select
        id={field.id}
        value={value}
        onChange={onChange}
        className={`${className} appearance-none`}
        style={{ colorScheme: "light dark" }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${field.id}-error` : undefined}
      >
        <option
          value=""
          className="bg-white text-black dark:bg-[#101010] dark:text-white"
        >
          Select...
        </option>
        {field.options.map((option) => {
          const value = typeof option === "string" ? option : option.value;
          const label = typeof option === "string" ? option : option.label;
          return (
            <option
              key={`${field.id}-${label}`}
              value={value}
              className="bg-white text-black dark:bg-[#101010] dark:text-white"
            >
              {label}
            </option>
          );
        })}
      </select>
      {error && (
        <p id={`${field.id}-error`} className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

function MultiSelectControl({
  field,
  value,
  labelClass,
  error,
  onToggle,
}: {
  field: (typeof selectFields)[number];
  value: string;
  labelClass: string;
  error?: string;
  onToggle: (id: keyof BusinessFormData, value: string) => void;
}) {
  const selected = parseMultiValue(value);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const summary = selected.length > 0 ? selected.join(", ") : "Select...";

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        wrapperRef.current?.contains(event.target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget)
        )
          return;
        setOpen(false);
      }}
    >
      <label htmlFor={field.id} className={labelClass}>
        {field.label}
        {field.optional ? "" : " *"}
      </label>
      <button
        id={field.id}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-[42px] w-full items-center justify-between gap-3 border bg-black/[0.02] px-3 py-2 text-left text-sm text-black outline-none transition-all dark:bg-[#101010] dark:text-white ${
          error
            ? "border-red-500 dark:border-red-500"
            : "border-black/10 dark:border-white/10"
        } focus:border-[var(--color-brand-accent)] focus:ring-1 focus:ring-[var(--color-brand-accent)]/20`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-describedby={error ? `${field.id}-error` : undefined}
      >
        <span
          className={`min-w-0 flex-1 truncate ${selected.length ? "" : "text-black/30 dark:text-white/20"}`}
        >
          {summary}
        </span>
        <span className="shrink-0 text-xs text-black/35 dark:text-white/35">
          {selected.length ? `${selected.length} selected` : "v"}
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-56 overflow-auto border border-black/10 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-[#080808]"
        >
          {field.options.map((option) => {
            const { value: optionValue, label } = optionParts(option);
            const active = selected.includes(optionValue);
            return (
              <button
                key={`${field.id}-${optionValue}`}
                type="button"
                onClick={() => onToggle(field.id, optionValue)}
                role="option"
                aria-selected={active}
                className={`mb-1 block w-full rounded-sm border px-2.5 py-2 text-left text-xs leading-4 transition last:mb-0 ${
                  active
                    ? "border-[var(--color-brand-accent)] bg-[var(--color-brand-accent)] text-black"
                    : "border-black/10 bg-black/[0.02] text-black/65 hover:border-black/25 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:border-white/25"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
      {error && (
        <p id={`${field.id}-error`} className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

function ToggleGroup({
  title,
  error,
  children,
}: {
  title: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-black/60 dark:text-white/60">
        {title} *
      </legend>
      <div
        className={`flex flex-wrap gap-1.5 border p-2 ${error ? "border-red-500" : "border-black/10 dark:border-white/10"}`}
      >
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </fieldset>
  );
}

function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-sm border px-2.5 py-1 text-[11px] transition ${
        active
          ? "border-[var(--color-brand-accent)] bg-[var(--color-brand-accent)] text-black"
          : "border-black/10 bg-black/[0.02] text-black/60 hover:border-black/25 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:hover:border-white/25"
      }`}
    >
      {label}
    </button>
  );
}

function ScanButton({
  loading,
  onClick,
}: {
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="mt-[18px] inline-flex h-[38px] w-[42px] shrink-0 items-center justify-center rounded-sm border border-black/10 bg-black/[0.02] text-black/60 transition hover:border-[var(--color-brand-accent)] hover:text-[var(--color-brand-accent)] disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60"
      aria-label="Scan website"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Search className="h-4 w-4" />
      )}
    </button>
  );
}
