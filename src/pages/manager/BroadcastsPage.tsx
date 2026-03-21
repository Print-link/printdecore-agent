import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  whatsappFeaturesApi,
  type Broadcast,
  type WhatsAppLabel,
} from "../../services/api/whatsappFeatures";
import {
  Card,
  PageHeader,
  Button,
  Badge,
  EmptyState,
  Input,
  Select,
  Modal,
} from "../../components/ui";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import {
  Send,
  Plus,
  Receipt,
  Users,
  Check,
  AlertCircle,
  Eye,
  Play,
  TrendingUp,
} from "../../components/icons";

const STATUS_COLORS: Record<
  string,
  "amber" | "green" | "blue" | "red" | "gray" | "purple"
> = {
  draft: "gray",
  scheduled: "blue",
  sending: "amber",
  completed: "green",
  cancelled: "red",
  failed: "red",
};

export default function BroadcastsPage() {
  const t = useThemeClasses();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [targetType, setTargetType] = useState<"all" | "labels">("all");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: broadcasts = [], isLoading } = useQuery<Broadcast[]>({
    queryKey: ["whatsapp", "broadcasts"],
    queryFn: () => whatsappFeaturesApi.getBroadcasts(),
    staleTime: 15000,
    refetchInterval: 30000,
  });

  const { data: labels = [] } = useQuery<WhatsAppLabel[]>({
    queryKey: ["whatsapp", "labels"],
    queryFn: () => whatsappFeaturesApi.getLabels(),
    staleTime: 60000,
    enabled: showCreate,
  });

  const { data: detail } = useQuery({
    queryKey: ["whatsapp", "broadcast", detailId],
    queryFn: () => whatsappFeaturesApi.getBroadcastDetail(detailId!),
    enabled: !!detailId,
    refetchInterval: detailId ? 5000 : false,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      whatsappFeaturesApi.createBroadcast({
        name,
        messageBody,
        targetType,
        targetLabelIds: targetType === "labels" ? selectedLabelIds : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "broadcasts"] });
      setShowCreate(false);
      setName("");
      setMessageBody("");
      setTargetType("all");
      setSelectedLabelIds([]);
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => whatsappFeaturesApi.sendBroadcast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "broadcasts"] });
    },
  });

  const toggleLabel = useCallback((id: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id],
    );
  }, []);

  // Stats
  const totalSent = broadcasts.reduce((s, b) => s + b.sentCount, 0);
  const totalDelivered = broadcasts.reduce((s, b) => s + b.deliveredCount, 0);
  const totalRecipients = broadcasts.reduce((s, b) => s + b.totalRecipients, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Broadcast Campaigns"
        description="Send messages to multiple contacts at once"
        actions={
          <Button icon={Plus} onClick={() => setShowCreate(true)}>
            New Campaign
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className={cn("text-sm", t.textSecondary)}>Total Campaigns</p>
              <p className={cn("text-2xl font-bold", t.text)}>
                {broadcasts.length}
              </p>
            </div>
            <Receipt size={24} className="text-amber-500" />
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className={cn("text-sm", t.textSecondary)}>Messages Sent</p>
              <p className={cn("text-2xl font-bold", t.text)}>{totalSent}</p>
            </div>
            <Send size={24} className="text-blue-500" />
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className={cn("text-sm", t.textSecondary)}>Delivery Rate</p>
              <p className={cn("text-2xl font-bold", t.text)}>
                {totalSent > 0
                  ? Math.round((totalDelivered / totalSent) * 100)
                  : 0}
                %
              </p>
            </div>
            <TrendingUp size={24} className="text-green-500" />
          </div>
        </Card>
      </div>

      {/* Broadcast List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <EmptyState
          title="No broadcasts yet"
          description="Create your first broadcast campaign to reach multiple contacts"
          action={
            <Button icon={Plus} onClick={() => setShowCreate(true)}>
              Create Campaign
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {broadcasts.map((bc) => (
            <Card key={bc.id} className="rounded-xl" padding="md">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={cn("font-semibold truncate", t.text)}>
                      {bc.name}
                    </h4>
                    <Badge color={STATUS_COLORS[bc.status] || "gray"}>
                      {bc.status.charAt(0).toUpperCase() + bc.status.slice(1)}
                    </Badge>
                  </div>
                  <p className={cn("text-xs truncate", t.textSecondary)}>
                    {bc.messageBody}
                  </p>
                  <div
                    className={cn(
                      "flex items-center gap-4 mt-2 text-xs",
                      t.textTertiary,
                    )}
                  >
                    <span>
                      <Users size={10} className="inline mr-1" />
                      {bc.totalRecipients} recipients
                    </span>
                    <span>
                      <Check size={10} className="inline mr-1 text-green-500" />
                      {bc.sentCount} sent
                    </span>
                    {bc.failedCount > 0 && (
                      <span>
                        <AlertCircle
                          size={10}
                          className="inline mr-1 text-red-500"
                        />
                        {bc.failedCount} failed
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {bc.status === "draft" && (
                    <Button
                      size="sm"
                      icon={Play}
                      onClick={() => sendMutation.mutate(bc.id)}
                      loading={sendMutation.isPending}
                    >
                      Send
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Eye}
                    onClick={() => setDetailId(bc.id)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Broadcast Campaign"
        maxWidth="lg"
      >
        <div className="p-6 space-y-4">
          <Input
            label="Campaign Name"
            placeholder="e.g., Weekend Promo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div>
            <label
              className={cn("block text-sm font-medium mb-1", t.textSecondary)}
            >
              Message
            </label>
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Type the message to broadcast..."
              rows={4}
              className={cn(
                "w-full px-4 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400",
                t.input,
              )}
            />
          </div>
          <Select
            label="Target Audience"
            options={[
              { value: "all", label: "All contacts" },
              { value: "labels", label: "Contacts with specific labels" },
            ]}
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as any)}
          />
          {targetType === "labels" && (
            <div>
              <label
                className={cn(
                  "block text-sm font-medium mb-2",
                  t.textSecondary,
                )}
              >
                Select Labels
              </label>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => toggleLabel(label.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      selectedLabelIds.includes(label.id)
                        ? "text-white border-transparent"
                        : t.isDark
                          ? "border-gray-600 text-gray-400"
                          : "border-gray-300 text-gray-600",
                    )}
                    style={
                      selectedLabelIds.includes(label.id)
                        ? { backgroundColor: label.color }
                        : {}
                    }
                  >
                    {label.name}
                    {label.chatCount !== undefined && ` (${label.chatCount})`}
                  </button>
                ))}
                {labels.length === 0 && (
                  <p className={cn("text-xs", t.textTertiary)}>
                    No labels created yet. Create labels in chat conversations
                    first.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <div
          className={cn("flex justify-end gap-3 px-6 py-4 border-t", t.border)}
        >
          <Button variant="secondary" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
          <Button
            icon={Send}
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!name.trim() || !messageBody.trim()}
          >
            Create Campaign
          </Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        title={detail?.name || "Broadcast Details"}
        maxWidth="lg"
      >
        {detail && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge color={STATUS_COLORS[detail.status] || "gray"}>
                {detail.status}
              </Badge>
              <span className={cn("text-sm", t.textSecondary)}>
                {detail.totalRecipients} recipients
              </span>
            </div>

            {/* Progress */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                {
                  label: "Sent",
                  value: detail.sentCount,
                  color: "text-blue-500",
                },
                {
                  label: "Delivered",
                  value: detail.deliveredCount,
                  color: "text-green-500",
                },
                {
                  label: "Read",
                  value: detail.readCount,
                  color: "text-purple-500",
                },
                {
                  label: "Failed",
                  value: detail.failedCount,
                  color: "text-red-500",
                },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                  <p className={cn("text-xs", t.textSecondary)}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Message preview */}
            <div
              className={cn(
                "p-4 rounded-lg border mb-4",
                t.isDark
                  ? "bg-gray-700/50 border-gray-600"
                  : "bg-gray-50 border-gray-200",
              )}
            >
              <p className={cn("text-xs font-medium mb-1", t.textTertiary)}>
                Message
              </p>
              <p className={cn("text-sm whitespace-pre-wrap", t.text)}>
                {detail.messageBody}
              </p>
            </div>

            {/* Recipients */}
            {detail.recipients && detail.recipients.length > 0 && (
              <div>
                <p className={cn("text-xs font-medium mb-2", t.textTertiary)}>
                  Recipients ({detail.recipients.length})
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {detail.recipients.map((r: any) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between text-xs py-1"
                    >
                      <span className={t.text}>
                        {r.contactName || r.chatId}
                      </span>
                      <Badge color={STATUS_COLORS[r.status] || "gray"}>
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
