import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuthStore } from "../../stores/authStore";
import { useBranchStore } from "../../stores/branchStore";
import { useWhatsAppStore } from "../../stores/whatsappStore";
import { usePermissions, PERMISSIONS } from "../../hooks/usePermissions";
import { useMyBranches, useSwitchBranch } from "../../hooks/useBranchScope";
import { getVendorHome, type HomePeriod, type VendorHome, type Compared, type PipelineStage } from "../../services/api/vendorHome";
import { StatusBadge } from "../../components/ui";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  CreditCard,
  Printer,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Star,
  SpinnerRing,
} from "../../components/icons";
import { useThemeClasses } from "../../lib/theme";
import { cn, formatCurrency } from "../../lib/utils";

const PERIODS: { value: HomePeriod; label: string; previous: string }[] = [
  { value: "today", label: "Today", previous: "yesterday" },
  { value: "7d", label: "7 days", previous: "previous 7 days" },
  { value: "30d", label: "30 days", previous: "previous 30 days" },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/** Change against the previous period; null when there's nothing to compare */
const change = ({ current, previous }: Compared) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? null : 0;

const when = (iso: string) => {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short" });
};

/** Short money for chart axes: ₵800, ₵1.2k, ₵3M */
const axisMoney = (v: number) =>
  v >= 1_000_000 ? `₵${+(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `₵${+(v / 1000).toFixed(1)}k` : `₵${Math.round(v)}`;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** One colour per stage of an order, used by the bar and its legend */
const STAGE_COLOURS: Record<PipelineStage, string> = {
  new: "bg-amber-400",
  quoted: "bg-sky-400",
  paid: "bg-emerald-500",
  production: "bg-violet-500",
  ready: "bg-teal-400",
};

/**
 * Home for a branch, or for every branch at once. Four sections, top to
 * bottom: what needs you now, where open orders stand, how the shop is doing,
 * and the latest orders.
 */
export default function HomePage() {
  const t = useThemeClasses();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const { isManager, hasPermission } = usePermissions();
  const { chats, isConnected } = useWhatsAppStore();
  const { switchTo } = useSwitchBranch();
  const { data: branches } = useMyBranches();
  const [period, setPeriod] = useState<HomePeriod>("7d");

  // Clerks are tied to their branch; the API scopes them to it
  const branchId = isManager ? selectedBranch?.id ?? null : user?.branch_id ?? null;
  const showMoney = isManager || hasPermission(PERMISSIONS.DASHBOARD_ANALYTICS);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["vendorHome", branchId, period],
    queryFn: () => getVendorHome(branchId, period),
    // A one-branch shop is about to be scoped to it; don't load "all" first
    enabled: !!user && (!isManager || (!!branches && (branches.length !== 1 || !!selectedBranch))),
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
  });

  const unread = isConnected ? chats.reduce((sum, c) => sum + c.unreadCount, 0) : 0;
  const allBranches = isManager && !selectedBranch && (data?.branchCount ?? 0) > 1;
  const previousLabel = PERIODS.find((p) => p.value === period)!.previous;

  /** Order lists are per branch; with all branches showing, open the order's own */
  const openOrders = async (query: string, branch?: { id: string }) => {
    if (allBranches && branch) await switchTo(branch);
    navigate(`/app/orders${query}`);
  };

  const name = user?.firstName || user?.name?.split(" ")[0];
  const scope = isManager
    ? selectedBranch?.name ?? (allBranches ? `All ${data?.branchCount} branches` : "")
    : "Your branch";

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <header>
        <h1 className={cn("text-xl sm:text-2xl font-semibold tracking-tight", t.text)}>
          {greeting()}
          {name ? `, ${name}` : ""}
        </h1>
        <p className={cn("text-sm mt-0.5", t.textSecondary)}>
          {scope && <span className={cn("font-medium", t.text)}>{scope}</span>}
          {scope && " · "}
          {new Date().toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </header>

      {isLoading ? (
        <HomeSkeleton />
      ) : isError || !data ? (
        <div className={cn("rounded-xl p-8 text-center", t.surface)}>
          <p className={t.text}>Couldn't load your Home.</p>
          <button onClick={() => refetch()} className="mt-3 text-sm font-medium text-amber-600 hover:underline">
            Try again
          </button>
        </div>
      ) : (
        <>
          {isManager && data.setup && !data.setup.live && <SetupBanner setup={data.setup} />}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <Attention
              className="lg:col-span-3"
              data={data}
              unread={unread}
              open={(q) => openOrders(q)}
              openMessages={() => navigate("/app/messages")}
            />
            <Pipeline className="lg:col-span-2" data={data} open={(stage) => openOrders(`?filter=stage:${stage}`)} />
          </div>

          {showMoney && (
            <Performance
              data={data}
              period={period}
              setPeriod={setPeriod}
              previousLabel={previousLabel}
              refreshing={isFetching && !isLoading}
            />
          )}

          {allBranches && data.branches.length > 0 && (
            <BranchTable data={data} showMoney={showMoney} pick={(b) => switchTo(b)} />
          )}

          <RecentOrders
            data={data}
            showBranch={allBranches}
            showMoney={showMoney}
            open={(o) => openOrders(`?order=${o.id}`, { id: o.branchId })}
            viewAll={() => openOrders("")}
          />
        </>
      )}
    </div>
  );
}

/* ─── Building blocks ───────────────────────────────────────────────────── */

function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const t = useThemeClasses();
  return (
    <section className={cn("rounded-xl flex flex-col", t.surface, className)}>
      <div className={cn("flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b", t.border)}>
        <div className="min-w-0">
          <h2 className={cn("text-[15px] font-semibold", t.text)}>{title}</h2>
          {subtitle && <p className={cn("text-xs mt-0.5", t.textTertiary)}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ─── Setup: one line until opened ──────────────────────────────────────── */

function SetupBanner({ setup }: { setup: NonNullable<VendorHome["setup"]> }) {
  const t = useThemeClasses();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const done = setup.items.filter((i) => i.done).length;
  const pct = Math.round((done / Math.max(setup.items.length, 1)) * 100);
  const next = setup.items.find((i) => !i.done);
  // Every step done: either Printdecore still has to list the shop, or the shop paused itself
  const allDone = setup.ready ?? !next;
  const paused = allDone && setup.listed && setup.acceptingOrders === false;
  const waiting = allDone && !paused;

  return (
    <section
      className={cn(
        "rounded-xl border",
        t.isDark ? "bg-amber-950/20 border-amber-800/40" : "bg-amber-50/70 border-amber-200",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
        <div className="relative h-10 w-10 shrink-0" aria-hidden="true">
          <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" className={t.isDark ? "stroke-gray-700" : "stroke-amber-100"} />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className={allDone ? "stroke-emerald-500" : "stroke-amber-500"}
              strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
            />
          </svg>
          <span className={cn("absolute inset-0 flex items-center justify-center text-[10px] font-bold", t.text)}>{done}/{setup.items.length}</span>
        </div>
        <div className="flex-1 min-w-[12rem]">
          <p className={cn("text-sm font-semibold", t.text)}>
            {paused
              ? "Your shop is hidden from the marketplace"
              : waiting
                ? "Setup complete — waiting for Printdecore to list your shop"
                : "Finish setting up to appear on the marketplace"}
          </p>
          <p className={cn("text-xs", t.textSecondary)}>
            {paused ? (
              "You've paused new orders. Customers can't find you until you resume."
            ) : waiting ? (
              "There's nothing more for you to do. Printdecore reviews new shops and lists them shortly."
            ) : next ? (
              <>
                Next: <span className="font-medium">{next.label}</span>
                {next.owner === "ops" ? " — Printdecore turns this on for you" : ""}
              </>
            ) : (
              "Almost there"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {paused && (
            <button
              type="button"
              onClick={() => navigate("/app/branch-info/marketplace")}
              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-black text-sm font-semibold"
            >
              Resume orders
            </button>
          )}
          {next?.link && next.owner !== "ops" && (
            <button
              type="button"
              onClick={() => navigate(next.link!)}
              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-black text-sm font-semibold"
            >
              Continue
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={cn("inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm", t.textSecondary, t.isDark ? "hover:bg-gray-800" : "hover:bg-amber-100/70")}
          >
            {open ? "Hide" : "All steps"}
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {open && (
        <ul className={cn("grid sm:grid-cols-2 gap-x-6 px-5 pb-4 pt-1 border-t", t.isDark ? "border-amber-800/30" : "border-amber-200/70")}>
          {setup.items.map((item) => {
            const clickable = !item.done && item.link && item.owner !== "ops";
            return (
              <li key={item.key}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && navigate(item.link!)}
                  className={cn(
                    "w-full flex items-start gap-3 py-2 text-left rounded-lg",
                    clickable && "hover:underline",
                  )}
                >
                  {item.done ? (
                    <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                  ) : (
                    <span className={cn("w-[18px] h-[18px] mt-0.5 rounded-full border-2 shrink-0", t.isDark ? "border-gray-600" : "border-amber-300")} />
                  )}
                  <span className="min-w-0">
                    <span className={cn("block text-sm", item.done ? t.textTertiary : t.text)}>{item.label}</span>
                    {!item.done && (
                      <span className={cn("block text-xs", t.textTertiary)}>
                        {item.owner === "ops" ? "Printdecore turns this on for you" : item.hint}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ─── Needs your attention: one prioritised list ────────────────────────── */

type Tone = "critical" | "action" | "info";

function Attention({
  data,
  unread,
  open,
  openMessages,
  className,
}: {
  data: VendorHome;
  unread: number;
  open: (query: string) => void;
  openMessages: () => void;
  className?: string;
}) {
  const t = useThemeClasses();
  const a = data.attention;
  // Most urgent first; only what has something in it
  const rows: { key: string; tone: Tone; icon: typeof Clock; title: string; detail: string; count: number; go: () => void }[] = [
    { key: "late", tone: "critical" as Tone, icon: AlertTriangle, count: a.overdue, title: `${plural(a.overdue, "order")} overdue`, detail: "Past the time you promised — finish or update the customer", go: () => open("?filter=due:overdue") },
    { key: "start", tone: "action" as Tone, icon: Printer, count: a.toStart, title: `${plural(a.toStart, "paid order")} to start`, detail: "The customer has paid — review and begin", go: () => open("?filter=stage:paid") },
    { key: "quote", tone: "action" as Tone, icon: FileText, count: a.toQuote, title: `${plural(a.toQuote, "request")} to price`, detail: "Customers are waiting for your quote", go: () => open("?filter=stage:new") },
    { key: "due", tone: "action" as Tone, icon: Clock, count: a.dueToday, title: `${plural(a.dueToday, "order")} due today`, detail: "Promised for today", go: () => open("?filter=due:today") },
    { key: "msgs", tone: "action" as Tone, icon: MessageCircle, count: unread, title: `${plural(unread, "unread message")}`, detail: "On WhatsApp", go: openMessages },
    { key: "pay", tone: "info" as Tone, icon: CreditCard, count: a.awaitingPayment, title: `${plural(a.awaitingPayment, "quote")} awaiting payment`, detail: "Waiting on the customer — nothing to do yet", go: () => open("?filter=stage:quoted") },
  ].filter((r) => r.count > 0);

  const toDo = rows.filter((r) => r.tone !== "info").reduce((s, r) => s + r.count, 0);

  const toneStyles: Record<Tone, { icon: string; chip: string }> = {
    critical: {
      icon: t.isDark ? "bg-red-900/40 text-red-400" : "bg-red-50 text-red-600",
      chip: t.isDark ? "bg-red-900/40 text-red-300" : "bg-red-100 text-red-700",
    },
    action: {
      icon: t.isDark ? "bg-amber-900/30 text-amber-400" : "bg-amber-50 text-amber-600",
      chip: t.isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700",
    },
    info: {
      icon: t.isDark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500",
      chip: t.isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600",
    },
  };

  return (
    <Panel
      className={className}
      title="Needs your attention"
      subtitle={toDo ? `${plural(toDo, "thing")} to do` : "You're all caught up"}
    >
      {rows.length ? (
        <ul className={cn("divide-y", t.isDark ? "divide-gray-700" : "divide-gray-100")}>
          {rows.map((r) => {
            const Icon = r.icon;
            const s = toneStyles[r.tone];
            return (
              <li key={r.key}>
                <button
                  type="button"
                  onClick={r.go}
                  className={cn("group w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-colors", t.isDark ? "hover:bg-gray-700/30" : "hover:bg-gray-50")}
                >
                  <span className={cn("h-9 w-9 shrink-0 rounded-lg flex items-center justify-center", s.icon)}>
                    <Icon size={18} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={cn("block text-sm font-medium", r.tone === "critical" ? "text-red-600 dark:text-red-400" : t.text)}>{r.title}</span>
                    <span className={cn("block text-xs truncate", t.textTertiary)}>{r.detail}</span>
                  </span>
                  <ChevronRight size={16} className={cn("shrink-0 transition-transform group-hover:translate-x-0.5", t.textTertiary)} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <span className={cn("h-10 w-10 rounded-full flex items-center justify-center", t.isDark ? "bg-emerald-900/30" : "bg-emerald-50")}>
            <CheckCircle size={20} className="text-emerald-500" />
          </span>
          <p className={cn("text-sm font-medium", t.text)}>Nothing waiting on you</p>
          <p className={cn("text-xs", t.textTertiary)}>New orders and messages will show up here.</p>
        </div>
      )}
    </Panel>
  );
}

/* ─── Open orders: one bar, one legend ──────────────────────────────────── */

function Pipeline({ data, open, className }: { data: VendorHome; open: (stage: PipelineStage) => void; className?: string }) {
  const t = useThemeClasses();
  const total = data.pipeline.reduce((s, p) => s + p.count, 0);
  return (
    <Panel className={className} title="Open orders" subtitle={total ? `${plural(total, "order")} in progress` : "No open orders"}>
      <div className="px-5 py-4 flex-1 flex flex-col">
        <div
          className={cn("flex h-2.5 w-full overflow-hidden rounded-full", t.isDark ? "bg-gray-700" : "bg-gray-100")}
          role="img"
          aria-label={data.pipeline.map((p) => `${p.label}: ${p.count}`).join(", ")}
        >
          {total > 0 &&
            data.pipeline
              .filter((p) => p.count > 0)
              .map((p) => (
                <span
                  key={p.stage}
                  className={cn("h-full first:rounded-l-full last:rounded-r-full border-r-2 last:border-r-0", STAGE_COLOURS[p.stage], t.isDark ? "border-gray-800" : "border-white")}
                  style={{ width: `${(p.count / total) * 100}%` }}
                />
              ))}
        </div>
        <ul className="mt-3 -mx-2">
          {data.pipeline.map((p) => (
            <li key={p.stage}>
              <button
                type="button"
                onClick={() => open(p.stage)}
                className={cn("w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left", t.isDark ? "hover:bg-gray-700/30" : "hover:bg-gray-50")}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", STAGE_COLOURS[p.stage], p.count === 0 && "opacity-30")} />
                <span className={cn("flex-1 text-sm truncate", p.count ? t.text : t.textTertiary)}>{p.label}</span>
                <span className={cn("text-sm font-semibold tabular-nums", p.count ? t.text : t.textTertiary)}>{p.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

/* ─── Performance: figures, trend and best sellers together ────────────── */

function Delta({ value, previousLabel }: { value: number | null; previousLabel: string }) {
  const t = useThemeClasses();
  if (value === null) return <span className={cn("text-xs", t.textTertiary)}>New this period</span>;
  const up = value > 0;
  const flat = value === 0;
  return (
    <span className="text-xs" title={`Compared with the ${previousLabel}`}>
      <span
        className={cn(
          "font-semibold tabular-nums",
          flat ? t.textTertiary : up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
        )}
      >
        {flat ? "No change" : `${up ? "▲" : "▼"} ${Math.abs(value)}%`}
      </span>
      <span className={t.textTertiary}> vs {previousLabel}</span>
    </span>
  );
}

function Performance({
  data,
  period,
  setPeriod,
  previousLabel,
  refreshing,
}: {
  data: VendorHome;
  period: HomePeriod;
  setPeriod: (p: HomePeriod) => void;
  previousLabel: string;
  refreshing: boolean;
}) {
  const t = useThemeClasses();
  const m = data.metrics;
  const figures = [
    { label: "Sales", value: formatCurrency(m.sales.current), delta: <Delta value={change(m.sales)} previousLabel={previousLabel} /> },
    { label: "Orders", value: String(m.orders.current), delta: <Delta value={change(m.orders)} previousLabel={previousLabel} /> },
    { label: "Average order", value: formatCurrency(m.averageOrder.current), delta: <Delta value={change(m.averageOrder)} previousLabel={previousLabel} /> },
    {
      label: "Rating",
      value: m.rating.count ? (
        <span className="inline-flex items-center gap-1.5">
          {m.rating.average.toFixed(1)}
          <Star size={16} className="text-amber-400" />
        </span>
      ) : (
        "–"
      ),
      delta: <span className={cn("text-xs", t.textTertiary)}>{m.rating.count ? `${plural(m.rating.count, "review")}, all time` : "No reviews yet"}</span>,
    },
  ];

  return (
    <Panel
      title="Performance"
      subtitle="Paid orders in the selected period"
      action={
        <div className="flex items-center gap-2">
          {refreshing && <SpinnerRing size={16} />}
          <div role="radiogroup" aria-label="Period" className={cn("inline-flex p-0.5 rounded-lg border", t.border, t.isDark ? "bg-gray-900" : "bg-gray-50")}>
            {PERIODS.map((p) => (
              <button
                key={p.value}
                role="radio"
                aria-checked={period === p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-3 py-1 text-xs sm:text-sm rounded-md transition-colors",
                  period === p.value
                    ? t.isDark ? "bg-gray-700 text-white font-medium shadow-sm" : "bg-white text-gray-900 font-medium shadow-sm"
                    : cn(t.textSecondary, t.isDark ? "hover:text-gray-200" : "hover:text-gray-900"),
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {/* Key figures: one strip, divided — not four separate cards */}
      <dl className={cn("grid grid-cols-2 lg:grid-cols-4 border-b", t.border)}>
        {figures.map((f, i) => (
          <div
            key={f.label}
            className={cn(
              "px-5 py-4",
              t.border,
              i % 2 === 1 && "border-l",
              i >= 2 && "border-t lg:border-t-0",
              i === 2 && "lg:border-l",
            )}
          >
            <dt className={cn("text-xs font-medium uppercase tracking-wide", t.textTertiary)}>{f.label}</dt>
            <dd className={cn("mt-1 text-xl sm:text-2xl font-semibold tabular-nums tracking-tight", t.text)}>{f.value}</dd>
            <dd className="mt-0.5">{f.delta}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 px-3 pt-4 pb-3">
          <p className={cn("px-2 text-xs font-medium uppercase tracking-wide", t.textTertiary)}>Sales trend</p>
          <div className="h-60 mt-2">
            <SalesTrend data={data} />
          </div>
        </div>
        <div className={cn("px-5 py-4 border-t lg:border-t-0 lg:border-l", t.border)}>
          <p className={cn("text-xs font-medium uppercase tracking-wide", t.textTertiary)}>Best sellers</p>
          <TopProducts data={data} />
        </div>
      </div>
    </Panel>
  );
}

function SalesTrend({ data }: { data: VendorHome }) {
  const t = useThemeClasses();
  const stroke = t.isDark ? "#fbbf24" : "#d97706"; // amber 400 / 600
  const grid = t.isDark ? "#374151" : "#f3f4f6";
  const axis = t.isDark ? "#9ca3af" : "#6b7280";
  const any = data.series.some((s) => s.sales > 0 || s.orders > 0);
  if (!any) return <Empty text="No sales in this period yet" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data.series} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="homeSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={grid} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: axis }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis
          tick={{ fontSize: 11, fill: axis }}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={axisMoney}
        />
        <Tooltip
          cursor={{ stroke: axis, strokeDasharray: "3 3" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as VendorHome["series"][number];
            return (
              <div className={cn("rounded-lg border px-3 py-2 shadow-lg text-xs", t.isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}>
                <p className={cn("font-medium mb-0.5", t.text)}>{p.label}</p>
                <p className={t.text}>{formatCurrency(p.sales)}</p>
                <p className={t.textSecondary}>{plural(p.orders, "order")}</p>
              </div>
            );
          }}
        />
        <Area type="monotone" dataKey="sales" stroke={stroke} strokeWidth={2} fill="url(#homeSales)" activeDot={{ r: 4, strokeWidth: 2, stroke: t.isDark ? "#1f2937" : "#fff" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function TopProducts({ data }: { data: VendorHome }) {
  const t = useThemeClasses();
  const max = Math.max(...data.topProducts.map((p) => p.sales), 1);
  if (!data.topProducts.length) {
    return (
      <div className="h-32 lg:h-52 mt-2">
        <Empty text="Your best sellers will show here" />
      </div>
    );
  }
  return (
    <ol className="mt-3 space-y-3.5">
      {data.topProducts.map((p, i) => (
        <li key={p.name}>
          <div className="flex items-baseline gap-2 text-sm">
            <span className={cn("w-4 text-xs tabular-nums", t.textTertiary)}>{i + 1}</span>
            <span className={cn("flex-1 truncate", t.text)}>{p.name}</span>
            <span className={cn("tabular-nums shrink-0 font-medium", t.text)}>{formatCurrency(p.sales, { compact: true })}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 pl-6">
            <div className={cn("h-1.5 flex-1 rounded-full overflow-hidden", t.isDark ? "bg-gray-700" : "bg-gray-100")}>
              <div className="h-full rounded-full bg-amber-400" style={{ width: `${(p.sales / max) * 100}%` }} />
            </div>
            <span className={cn("text-xs tabular-nums w-16 text-right", t.textTertiary)}>{plural(p.orders, "order")}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ─── Tables ────────────────────────────────────────────────────────────── */

function BranchTable({ data, showMoney, pick }: { data: VendorHome; showMoney: boolean; pick: (b: { id: string }) => void }) {
  const t = useThemeClasses();
  const th = cn("px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-right", t.textTertiary);
  return (
    <Panel title="Branches" subtitle="Select a branch to work in it">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={t.surfaceInset}>
            <tr className={cn("border-b", t.border)}>
              <th className={cn(th, "text-left")}>Branch</th>
              {showMoney && <th className={th}>Sales</th>}
              <th className={th}>Orders</th>
              <th className={th}>Open now</th>
              <th className={th}>Rating</th>
            </tr>
          </thead>
          <tbody>
            {data.branches.map((b) => (
              <tr
                key={b.id}
                onClick={() => pick(b)}
                className={cn("cursor-pointer border-b last:border-0", t.border, t.isDark ? "hover:bg-gray-700/30" : "hover:bg-gray-50")}
              >
                <td className={cn("px-5 py-3 font-medium", t.text)}>{b.name}</td>
                {showMoney && <td className={cn("px-5 py-3 text-right tabular-nums", t.text)}>{formatCurrency(b.sales)}</td>}
                <td className={cn("px-5 py-3 text-right tabular-nums", t.text)}>{b.orders}</td>
                <td className={cn("px-5 py-3 text-right tabular-nums", b.openOrders ? t.text : t.textTertiary)}>{b.openOrders}</td>
                <td className={cn("px-5 py-3 text-right tabular-nums", t.textSecondary)}>{b.rating ? b.rating.toFixed(1) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function RecentOrders({
  data,
  showBranch,
  showMoney,
  open,
  viewAll,
}: {
  data: VendorHome;
  showBranch: boolean;
  showMoney: boolean;
  open: (o: VendorHome["recentOrders"][number]) => void;
  viewAll: () => void;
}) {
  const t = useThemeClasses();
  const th = cn("px-3 sm:px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-left whitespace-nowrap", t.textTertiary);
  return (
    <Panel
      title="Latest orders"
      action={
        data.recentOrders.length > 0 && (
          <button onClick={viewAll} className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1">
            View all <ArrowRight size={14} />
          </button>
        )
      }
    >
      {data.recentOrders.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={t.surfaceInset}>
              <tr className={cn("border-b", t.border)}>
                <th className={th}>Order</th>
                <th className={cn(th, "hidden sm:table-cell")}>Customer</th>
                {showBranch && <th className={cn(th, "hidden md:table-cell")}>Branch</th>}
                <th className={th}>Status</th>
                <th className={cn(th, "hidden sm:table-cell")}>Placed</th>
                {showMoney && <th className={cn(th, "text-right hidden sm:table-cell")}>Total</th>}
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => open(o)}
                  className={cn("cursor-pointer border-b last:border-0", t.border, t.isDark ? "hover:bg-gray-700/30" : "hover:bg-gray-50")}
                >
                  <td className="px-3 sm:px-5 py-3 w-full max-w-0 sm:max-w-[16rem] sm:w-auto">
                    <span className={cn("block font-medium truncate", t.text)}>
                      {o.product ?? "Custom job"}
                      {o.items > 1 && <span className={t.textTertiary}> +{o.items - 1} more</span>}
                    </span>
                    <span className={cn("block text-xs truncate sm:hidden", t.textTertiary)}>
                      {[o.customerName ?? "Customer", when(o.createdAt), showMoney && formatCurrency(o.total)].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className={cn("px-3 sm:px-5 py-3 hidden sm:table-cell whitespace-nowrap", t.textSecondary)}>{o.customerName ?? "Customer"}</td>
                  {showBranch && <td className={cn("px-3 sm:px-5 py-3 hidden md:table-cell whitespace-nowrap", t.textSecondary)}>{o.branchName}</td>}
                  <td className="px-3 sm:px-5 py-3">
                    <StatusBadge status={o.status as never} className="text-[11px] px-2 py-0.5 whitespace-nowrap" />
                  </td>
                  <td className={cn("px-3 sm:px-5 py-3 hidden sm:table-cell whitespace-nowrap", t.textTertiary)}>{when(o.createdAt)}</td>
                  {showMoney && <td className={cn("px-3 sm:px-5 py-3 text-right tabular-nums whitespace-nowrap hidden sm:table-cell", t.text)}>{formatCurrency(o.total)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-40 p-5">
          <Empty text="No orders yet. They'll appear here as customers order." />
        </div>
      )}
    </Panel>
  );
}

function Empty({ text }: { text: string }) {
  const t = useThemeClasses();
  return (
    <div className={cn("h-full flex items-center justify-center rounded-lg border border-dashed text-sm text-center px-4", t.border, t.textTertiary)}>
      {text}
    </div>
  );
}

function HomeSkeleton() {
  const t = useThemeClasses();
  const block = cn("rounded-xl animate-pulse", t.isDark ? "bg-gray-800" : "bg-gray-200/70");
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className={cn(block, "h-64 lg:col-span-3")} />
        <div className={cn(block, "h-64 lg:col-span-2")} />
      </div>
      <div className={cn(block, "h-96")} />
      <div className={cn(block, "h-64")} />
    </div>
  );
}
