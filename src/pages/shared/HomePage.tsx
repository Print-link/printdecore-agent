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

/**
 * Home for a branch, or for every branch at once: what needs doing now, how the
 * shop is doing, and where open orders stand.
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={cn("text-2xl font-semibold tracking-tight", t.text)}>
            {greeting()}
            {name ? `, ${name}` : ""}
          </h1>
          <p className={cn("text-sm mt-0.5", t.textSecondary)}>
            {scope && <span className={cn("font-medium", t.text)}>{scope}</span>}
            {scope && " · "}
            {new Date().toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {showMoney && (
          <div className="flex items-center gap-2">
            {isFetching && !isLoading && <SpinnerRing size={16} />}
            <div
              role="radiogroup"
              aria-label="Period"
              className={cn("inline-flex p-0.5 rounded-lg border", t.border, t.isDark ? "bg-gray-800" : "bg-white")}
            >
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  role="radio"
                  aria-checked={period === p.value}
                  onClick={() => setPeriod(p.value)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md transition-colors",
                    period === p.value
                      ? t.isDark ? "bg-gray-700 text-white font-medium" : "bg-gray-900 text-white font-medium"
                      : cn(t.textSecondary, t.isDark ? "hover:text-gray-200" : "hover:text-gray-900"),
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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
          {isManager && data.setup && !data.setup.live && <SetupCard setup={data.setup} />}

          <NeedsYou data={data} unread={unread} open={(q) => openOrders(q)} openMessages={() => navigate("/app/messages")} />

          {showMoney && <Metrics data={data} previousLabel={previousLabel} />}

          <Pipeline data={data} open={(stage) => openOrders(`?filter=stage:${stage}`)} />

          {showMoney && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <SalesTrend data={data} />
              <TopProducts data={data} />
            </div>
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

/* ─── Sections ──────────────────────────────────────────────────────────── */

function Panel({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const t = useThemeClasses();
  return (
    <section className={cn("rounded-xl", t.surface, className)}>
      {title && (
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className={cn("text-sm font-semibold", t.text)}>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function SetupCard({ setup }: { setup: NonNullable<VendorHome["setup"]> }) {
  const t = useThemeClasses();
  const navigate = useNavigate();
  const done = setup.items.filter((i) => i.done).length;
  const pct = Math.round((done / Math.max(setup.items.length, 1)) * 100);
  return (
    <Panel>
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className={cn("text-base font-semibold", t.text)}>Get your shop ready for customers</h2>
            <p className={cn("text-sm", t.textSecondary)}>
              {done} of {setup.items.length} done. Customers can find you once everything is ticked.
            </p>
          </div>
          <span className={cn("text-sm font-semibold tabular-nums", t.text)}>{pct}%</span>
        </div>
        <div className={cn("h-1.5 rounded-full mt-3 overflow-hidden", t.isDark ? "bg-gray-700" : "bg-gray-100")}>
          <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-1">
          {setup.items.map((item) => {
            const clickable = !item.done && item.link;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && navigate(item.link!)}
                  className={cn(
                    "w-full flex items-start gap-3 py-2 px-2 -mx-2 rounded-lg text-left",
                    clickable && (t.isDark ? "hover:bg-gray-700/40" : "hover:bg-gray-50"),
                  )}
                >
                  {item.done ? (
                    <CheckCircle size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <span className={cn("w-[18px] h-[18px] mt-0.5 rounded-full border-2 flex-shrink-0", t.isDark ? "border-gray-600" : "border-gray-300")} />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className={cn("block text-sm", item.done ? cn(t.textTertiary, "line-through") : t.text)}>{item.label}</span>
                    {!item.done && (
                      <span className={cn("block text-xs", t.textTertiary)}>
                        {item.owner === "ops" ? "Printdecore turns this on for you" : item.hint}
                      </span>
                    )}
                  </span>
                  {clickable && <ChevronRight size={16} className={cn("mt-0.5", t.textTertiary)} />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}

function NeedsYou({
  data,
  unread,
  open,
  openMessages,
}: {
  data: VendorHome;
  unread: number;
  open: (query: string) => void;
  openMessages: () => void;
}) {
  const t = useThemeClasses();
  const a = data.attention;
  const tiles = [
    { key: "quote", label: "To quote", hint: "New requests", count: a.toQuote, icon: FileText, go: () => open("?filter=stage:new") },
    { key: "pay", label: "Awaiting payment", hint: "Quoted, not paid", count: a.awaitingPayment, icon: CreditCard, go: () => open("?filter=stage:quoted") },
    { key: "start", label: "To start", hint: "Paid, not started", count: a.toStart, icon: Printer, go: () => open("?filter=stage:paid") },
    { key: "due", label: "Due today", hint: "Open orders", count: a.dueToday, icon: Clock, go: () => open("?filter=due:today") },
    { key: "late", label: "Overdue", hint: "Past their due time", count: a.overdue, icon: AlertTriangle, go: () => open("?filter=due:overdue"), urgent: true },
    { key: "msgs", label: "Unread messages", hint: "WhatsApp", count: unread, icon: MessageCircle, go: openMessages },
  ];
  const waiting = tiles.some((x) => x.count > 0);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className={cn("text-sm font-semibold", t.text)}>Needs you</h2>
        {!waiting && <span className={cn("text-xs", t.textTertiary)}>You're all caught up</span>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {tiles.map((x) => {
          const Icon = x.icon;
          const on = x.count > 0;
          return (
            <button
              key={x.key}
              type="button"
              onClick={x.go}
              className={cn(
                "group text-left rounded-xl p-4 border transition-all",
                on
                  ? x.urgent
                    ? t.isDark ? "bg-red-950/40 border-red-800/60 hover:border-red-700" : "bg-red-50 border-red-200 hover:border-red-300"
                    : t.isDark ? "bg-amber-950/30 border-amber-700/50 hover:border-amber-600" : "bg-amber-50 border-amber-200 hover:border-amber-300"
                  : cn(t.isDark ? "bg-gray-800 border-gray-700 hover:border-gray-600" : "bg-white border-gray-200 hover:border-gray-300"),
              )}
            >
              <div className="flex items-center justify-between">
                <Icon
                  size={18}
                  className={on ? (x.urgent ? "text-red-500" : "text-amber-500") : t.textTertiary}
                />
                <ArrowRight size={14} className={cn("opacity-0 group-hover:opacity-100 transition-opacity", t.textTertiary)} />
              </div>
              <p className={cn("mt-3 text-2xl font-semibold tabular-nums", on ? t.text : t.textTertiary)}>{x.count}</p>
              <p className={cn("text-sm font-medium", on ? t.text : t.textSecondary)}>{x.label}</p>
              <p className={cn("text-xs", t.textTertiary)}>{x.hint}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Delta({ value, previousLabel }: { value: number | null; previousLabel: string }) {
  const t = useThemeClasses();
  if (value === null) return <span className={cn("text-xs", t.textTertiary)}>New vs {previousLabel}</span>;
  const up = value > 0;
  const flat = value === 0;
  return (
    <span className="text-xs">
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

function Metrics({ data, previousLabel }: { data: VendorHome; previousLabel: string }) {
  const t = useThemeClasses();
  const m = data.metrics;
  const cards = [
    { label: "Sales", value: formatCurrency(m.sales.current), delta: change(m.sales), hint: "Paid orders" },
    { label: "Orders", value: String(m.orders.current), delta: change(m.orders), hint: "Not cancelled" },
    { label: "Average order", value: formatCurrency(m.averageOrder.current), delta: change(m.averageOrder), hint: "Per paid order" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={cn("rounded-xl p-4", t.surface)}>
          <p className={cn("text-sm", t.textSecondary)}>{c.label}</p>
          <p className={cn("mt-1 text-2xl font-semibold tabular-nums tracking-tight", t.text)}>{c.value}</p>
          <div className="mt-1">
            <Delta value={c.delta} previousLabel={previousLabel} />
          </div>
        </div>
      ))}
      <div className={cn("rounded-xl p-4", t.surface)}>
        <p className={cn("text-sm", t.textSecondary)}>Rating</p>
        <p className={cn("mt-1 text-2xl font-semibold tabular-nums tracking-tight flex items-center gap-1.5", t.text)}>
          {m.rating.count ? m.rating.average.toFixed(1) : "–"}
          {m.rating.count > 0 && <Star size={18} className="text-amber-400" />}
        </p>
        <p className={cn("mt-1 text-xs", t.textTertiary)}>
          {m.rating.count ? `${m.rating.count} review${m.rating.count === 1 ? "" : "s"}, all time` : "No reviews yet"}
        </p>
      </div>
    </div>
  );
}

function Pipeline({ data, open }: { data: VendorHome; open: (stage: PipelineStage) => void }) {
  const t = useThemeClasses();
  const total = data.pipeline.reduce((s, p) => s + p.count, 0);
  return (
    <Panel
      title="Open orders"
      action={<span className={cn("text-xs tabular-nums", t.textTertiary)}>{total} in progress</span>}
    >
      <div className="px-5 pb-5">
        <div className="grid grid-cols-5 gap-1">
          {data.pipeline.map((p, i) => (
            <button
              key={p.stage}
              type="button"
              onClick={() => open(p.stage)}
              className={cn(
                "relative text-left px-3 py-3 transition-colors",
                i === 0 ? "rounded-l-lg" : "",
                i === data.pipeline.length - 1 ? "rounded-r-lg" : "",
                p.count > 0
                  ? t.isDark ? "bg-gray-700/60 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"
                  : t.isDark ? "bg-gray-800/60 hover:bg-gray-700/40" : "bg-gray-50 hover:bg-gray-100",
              )}
            >
              <p className={cn("text-xl font-semibold tabular-nums", p.count > 0 ? t.text : t.textTertiary)}>{p.count}</p>
              <p className={cn("text-xs sm:text-sm truncate", p.count > 0 ? t.textSecondary : t.textTertiary)}>{p.label}</p>
              {p.count > 0 && total > 0 && (
                <span
                  className="absolute left-0 bottom-0 h-1 bg-amber-400 rounded-full"
                  style={{ width: `${Math.max(8, (p.count / total) * 100)}%` }}
                />
              )}
            </button>
          ))}
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
  return (
    <Panel title="Sales" className="lg:col-span-2">
      <div className="h-64 px-2 pb-3">
        {any ? (
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
                width={64}
                tickFormatter={(v: number) => formatCurrency(v, { compact: true })}
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
                      <p className={t.textSecondary}>
                        {p.orders} order{p.orders === 1 ? "" : "s"}
                      </p>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="sales" stroke={stroke} strokeWidth={2} fill="url(#homeSales)" activeDot={{ r: 4, strokeWidth: 2, stroke: t.isDark ? "#1f2937" : "#fff" }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Empty text="No sales in this period yet" />
        )}
      </div>
    </Panel>
  );
}

function TopProducts({ data }: { data: VendorHome }) {
  const t = useThemeClasses();
  const max = Math.max(...data.topProducts.map((p) => p.sales), 1);
  return (
    <Panel title="Top products">
      <div className="px-5 pb-5">
        {data.topProducts.length ? (
          <ul className="space-y-3">
            {data.topProducts.map((p) => (
              <li key={p.name}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className={cn("truncate", t.text)}>{p.name}</span>
                  <span className={cn("tabular-nums flex-shrink-0", t.text)}>{formatCurrency(p.sales, { compact: true })}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn("h-1.5 flex-1 rounded-full overflow-hidden", t.isDark ? "bg-gray-700" : "bg-gray-100")}>
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${(p.sales / max) * 100}%` }} />
                  </div>
                  <span className={cn("text-xs tabular-nums w-16 text-right", t.textTertiary)}>
                    {p.orders} order{p.orders === 1 ? "" : "s"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="h-48">
            <Empty text="Your best sellers will show here" />
          </div>
        )}
      </div>
    </Panel>
  );
}

function BranchTable({ data, showMoney, pick }: { data: VendorHome; showMoney: boolean; pick: (b: { id: string }) => void }) {
  const t = useThemeClasses();
  const th = cn("px-5 py-2 text-xs font-medium text-right", t.textTertiary);
  return (
    <Panel title="Branches">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={cn("border-y", t.border)}>
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
  return (
    <Panel
      title="Latest orders"
      action={
        data.recentOrders.length > 0 && (
          <button onClick={viewAll} className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1">
            All orders <ArrowRight size={12} />
          </button>
        )
      }
    >
      {data.recentOrders.length ? (
        <ul className={cn("divide-y border-t", t.border, t.isDark ? "divide-gray-700" : "divide-gray-100")}>
          {data.recentOrders.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => open(o)}
                className={cn("w-full flex items-center gap-4 px-5 py-3 text-left", t.isDark ? "hover:bg-gray-700/30" : "hover:bg-gray-50")}
              >
                <span className="flex-1 min-w-0">
                  <span className={cn("block text-sm font-medium truncate", t.text)}>
                    {o.product ?? "Order"}
                    {o.items > 1 && <span className={t.textTertiary}> +{o.items - 1} more</span>}
                  </span>
                  <span className={cn("block text-xs truncate", t.textTertiary)}>
                    {[o.customerName ?? "Customer", showBranch && o.branchName, when(o.createdAt)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <StatusBadge status={o.status as never} className="text-[11px] px-2 py-0.5 flex-shrink-0" />
                {showMoney && (
                  <span className={cn("text-sm tabular-nums w-24 text-right flex-shrink-0", t.text)}>{formatCurrency(o.total)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="h-40 px-5 pb-5">
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
    <div className="space-y-6" aria-busy="true">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn(block, "h-28")} />
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(block, "h-24")} />
        ))}
      </div>
      <div className={cn(block, "h-28")} />
      <div className={cn(block, "h-72")} />
    </div>
  );
}
