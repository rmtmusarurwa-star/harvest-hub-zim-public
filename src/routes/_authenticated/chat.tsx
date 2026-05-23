import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  HandCoins,
  MessageSquare,
  Plus,
  Search as SearchIcon,
  Send,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  formatTime,
  initials,
  type ChatMessage,
  type ConversationWithMeta,
} from "@/lib/chat-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Search = { c?: string; listing?: string; farmer?: string; user?: string };

export const Route = createFileRoute("/_authenticated/chat")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    c: typeof s.c === "string" ? s.c : undefined,
    listing: typeof s.listing === "string" ? s.listing : undefined,
    farmer: typeof s.farmer === "string" ? s.farmer : undefined,
    user: typeof s.user === "string" ? s.user : undefined,
  }),
  component: ChatPage,
});

// Helpers to query untyped new tables
const db = supabase as unknown as {
  from: (t: string) => ReturnType<typeof supabase.from>;
  channel: typeof supabase.channel;
  removeChannel: typeof supabase.removeChannel;
};

function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/chat" });
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(search.c ?? null);

  // Auto-create / open conversation when arriving with ?listing=, ?farmer=, or ?user=
  useEffect(() => {
    if (!user) return;
    if (!search.listing && !search.farmer && !search.user) return;
    (async () => {
      let listingId: string | null = null;
      let farmerId: string | null = null;

      if (search.listing) {
        const { data: listing } = await supabase
          .from("listings")
          .select("id, farmer_id")
          .eq("id", search.listing!)
          .maybeSingle();
        if (!listing) {
          toast.error("Listing not found");
          navigate({ to: "/chat", search: {} });
          return;
        }
        if (listing.farmer_id === user.id) {
          toast.info("This is your own listing");
          navigate({ to: "/chat", search: {} });
          return;
        }
        listingId = listing.id;
        farmerId = listing.farmer_id;
      } else if (search.farmer || search.user) {
        const otherId = (search.farmer ?? search.user)!;
        if (otherId === user.id) {
          toast.info("You can't message yourself");
          navigate({ to: "/chat", search: {} });
          return;
        }
        // Try a recent listing for context, but it's optional now
        const { data: latest } = await supabase
          .from("listings")
          .select("id, farmer_id")
          .eq("farmer_id", otherId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        listingId = latest?.id ?? null;
        farmerId = otherId;
      }

      if (!farmerId) return;

      // Look for an existing conversation (with or without listing)
      let existingQuery = (db.from("conversations").select("id") as any)
        .eq("buyer_id", user.id)
        .eq("farmer_id", farmerId);
      existingQuery = listingId
        ? existingQuery.eq("listing_id", listingId)
        : existingQuery.is("listing_id", null);
      const { data: existing } = await existingQuery.maybeSingle();

      let convoId = (existing as { id: string } | null)?.id;
      if (!convoId) {
        const { data: created, error } = await (db
          .from("conversations")
          .insert({
            listing_id: listingId,
            buyer_id: user.id,
            farmer_id: farmerId,
          })
          .select("id")
          .single() as any);
        if (error) {
          console.error(error);
          toast.error("Could not start conversation: " + error.message);
          return;
        }
        convoId = (created as { id: string }).id;
      }
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setActiveId(convoId!);
      navigate({ to: "/chat", search: { c: convoId } });
    })();
  }, [search.listing, search.farmer, search.user, user, navigate, qc]);

  // Sync search.c -> activeId
  useEffect(() => {
    if (search.c && search.c !== activeId) setActiveId(search.c);
  }, [search.c]);

  const conversations = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ConversationWithMeta[]> => {
      const { data, error } = await (db
        .from("conversations")
        .select("*") as any)
        .or(`buyer_id.eq.${user!.id},farmer_id.eq.${user!.id}`)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as ConversationWithMeta[];
      if (rows.length === 0) return [];

      const listingIds = Array.from(
        new Set(rows.map((r) => r.listing_id).filter((x): x is string => !!x))
      );
      const otherIds = Array.from(
        new Set(
          rows.map((r) => (r.buyer_id === user!.id ? r.farmer_id : r.buyer_id))
        )
      );
      const convoIds = rows.map((r) => r.id);

      const [{ data: listings }, { data: profiles }, { data: lastMsgs }, { data: unread }] =
        await Promise.all([
          listingIds.length > 0
            ? supabase
                .from("listings")
                .select("id, title, price, unit, image_url, status")
                .in("id", listingIds)
            : Promise.resolve({ data: [] as any[] }),
          supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", otherIds),
          (db.from("messages").select("*") as any)
            .in("conversation_id", convoIds)
            .order("created_at", { ascending: false }),
          (db.from("messages").select("conversation_id, id") as any)
            .in("conversation_id", convoIds)
            .is("read_at", null)
            .neq("sender_id", user!.id),
        ]);

      const lastByConvo = new Map<string, ChatMessage>();
      ((lastMsgs ?? []) as ChatMessage[]).forEach((m) => {
        if (!lastByConvo.has(m.conversation_id)) lastByConvo.set(m.conversation_id, m);
      });
      const unreadByConvo = new Map<string, number>();
      ((unread ?? []) as { conversation_id: string }[]).forEach((m) => {
        unreadByConvo.set(m.conversation_id, (unreadByConvo.get(m.conversation_id) ?? 0) + 1);
      });
      const listingMap = new Map(
        ((listings ?? []) as ConversationWithMeta["listing"][]).filter(Boolean).map((l) => [l!.id, l!])
      );
      const profileMap = new Map(
        ((profiles ?? []) as ConversationWithMeta["counterpart"][]).filter(Boolean).map((p) => [p!.id, p!])
      );

      return rows.map((r) => ({
        ...r,
        listing: listingMap.get(r.listing_id) ?? null,
        counterpart:
          profileMap.get(r.buyer_id === user!.id ? r.farmer_id : r.buyer_id) ?? null,
        last_message: lastByConvo.get(r.id) ?? null,
        unread_count: unreadByConvo.get(r.id) ?? 0,
      }));
    },
  });

  // Realtime: refresh list on any new message
  useEffect(() => {
    if (!user) return;
    const ch = db
      .channel(`messages-list-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          qc.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();
    return () => {
      db.removeChannel(ch);
    };
  }, [user, qc]);

  const activeConvo = useMemo(
    () => conversations.data?.find((c) => c.id === activeId) ?? null,
    [conversations.data, activeId]
  );

  function openConvo(id: string) {
    setActiveId(id);
    navigate({ to: "/chat", search: { c: id } });
  }

  const [newChatOpen, setNewChatOpen] = useState(false);

  return (
    <section className="h-[calc(100vh-7rem)] -mx-3 lg:-mx-6">
      <div className="glass-strong mx-3 lg:mx-6 h-full overflow-hidden rounded-2xl">
        <div className="grid h-full grid-cols-1 lg:grid-cols-[340px_1fr]">
          {/* Conversation list */}
          <aside
            className={cn(
              "h-full border-r border-white/5 bg-black/20 flex flex-col",
              activeId ? "hidden lg:flex" : "flex"
            )}
          >
            <div className="border-b border-white/5 px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-display text-lg">Harvest Chat</div>
                  <p className="text-xs text-muted-foreground">
                    Conversations with farmers & buyers
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setNewChatOpen(true)}
                className="mt-3 w-full bg-accent text-background hover:bg-accent/90"
                size="sm"
              >
                <Plus className="h-4 w-4" /> Start New Chat
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.isLoading && (
                <div className="p-6 text-xs text-muted-foreground">Loading…</div>
              )}
              {conversations.data?.length === 0 && (
                <EmptyList />
              )}
              {conversations.data?.map((c) => (
                <ConversationRow
                  key={c.id}
                  convo={c}
                  active={c.id === activeId}
                  onClick={() => openConvo(c.id)}
                />
              ))}
            </div>
          </aside>

          {/* Active chat */}
          <div className={cn("h-full", !activeId && "hidden lg:block")}>
            {activeConvo && user ? (
              <ChatThread
                convo={activeConvo}
                currentUserId={user.id}
                onBack={() => {
                  setActiveId(null);
                  navigate({ to: "/chat", search: {} });
                }}
              />
            ) : (
              <ChatEmpty />
            )}
          </div>
        </div>
      </div>
      <NewChatModal
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        currentUserId={user?.id ?? ""}
        onPick={(otherId) => {
          setNewChatOpen(false);
          navigate({ to: "/chat", search: { user: otherId } });
        }}
      />
    </section>
  );
}

function ConversationRow({
  convo,
  active,
  onClick,
}: {
  convo: ConversationWithMeta;
  active: boolean;
  onClick: () => void;
}) {
  const title = convo.listing?.title ?? "Listing";
  const name = convo.counterpart?.full_name?.trim() || "Harvest Hub Member";
  const preview = convo.last_message
    ? convo.last_message.type === "offer"
      ? `💰 Offer · $${Number(convo.last_message.offer_price ?? 0).toFixed(2)}`
      : convo.last_message.content
    : "No messages yet";
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition",
        active ? "bg-secondary/10" : "hover:bg-white/[0.03]"
      )}
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-secondary font-display text-sm ring-1 ring-secondary/30">
        {initials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-foreground">{name}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatTime(convo.last_message_at)}
          </span>
        </div>
        <div className="truncate text-[11px] uppercase tracking-wide text-secondary/80">
          {title}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{preview}</p>
          {convo.unread_count > 0 && (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-medium text-background">
              {convo.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ChatEmpty() {
  return (
    <div className="grid h-full place-items-center p-10 text-center">
      <div className="space-y-2">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary/10 text-secondary">
          <MessageSquare className="h-6 w-6" />
        </div>
        <h3 className="font-display text-lg">Select a conversation</h3>
        <p className="mx-auto max-w-xs text-xs text-muted-foreground">
          Tap a thread on the left, or hit Contact Farmer on any listing to start chatting.
        </p>
      </div>
    </div>
  );
}

function EmptyList() {
  return (
    <div className="p-6 text-center text-xs text-muted-foreground">
      No conversations yet. Browse the marketplace and tap Contact Farmer to start one.
    </div>
  );
}

function ChatThread({
  convo,
  currentUserId,
  onBack,
}: {
  convo: ConversationWithMeta;
  currentUserId: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [showOffer, setShowOffer] = useState(false);
  const [offerPrice, setOfferPrice] = useState<string>(
    convo.listing ? String(convo.listing.price) : ""
  );
  const [offerQty, setOfferQty] = useState<string>("1");

  const isFarmer = currentUserId === convo.farmer_id;
  const counterpartName = convo.counterpart?.full_name?.trim() || "Member";

  const messages = useQuery({
    queryKey: ["messages", convo.id],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await (db
        .from("messages")
        .select("*") as any)
        .eq("conversation_id", convo.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
  });

  // Realtime per-conversation
  useEffect(() => {
    const ch = db
      .channel(`messages-${convo.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convo.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", convo.id] });
          qc.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();
    return () => {
      db.removeChannel(ch);
    };
  }, [convo.id, qc]);

  // Mark counterpart messages as read on open / new message
  useEffect(() => {
    if (!messages.data) return;
    const unread = messages.data.filter(
      (m) => m.sender_id !== currentUserId && !m.read_at
    );
    if (unread.length === 0) return;
    (async () => {
      await (db.from("messages").update({ read_at: new Date().toISOString() }) as any)
        .in(
          "id",
          unread.map((m) => m.id)
        );
      qc.invalidateQueries({ queryKey: ["conversations"] });
    })();
  }, [messages.data, currentUserId, qc]);

  // Autoscroll
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.data?.length]);

  const sendText = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await (db.from("messages").insert({
        conversation_id: convo.id,
        sender_id: currentUserId,
        type: "text",
        content,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
    },
    onError: (e: Error) => toast.error("Could not send: " + e.message),
  });

  const sendOffer = useMutation({
    mutationFn: async () => {
      const price = Number(offerPrice);
      const qty = Number(offerQty);
      if (!price || !qty) throw new Error("Enter price and quantity");
      const { error } = await (db.from("messages").insert({
        conversation_id: convo.id,
        sender_id: currentUserId,
        type: "offer",
        content: `Offer for ${qty} × ${convo.listing?.unit ?? "unit"} at $${price.toFixed(2)}`,
        offer_price: price,
        offer_quantity: qty,
        offer_status: "pending",
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => setShowOffer(false),
    onError: (e: Error) => toast.error(e.message),
  });

  const respondOffer = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "accepted" | "declined";
    }) => {
      const { error } = await (db
        .from("messages")
        .update({ offer_status: status }) as any)
        .eq("id", id);
      if (error) throw error;
    },
  });

  function submitText(e: React.FormEvent) {
    e.preventDefault();
    const v = draft.trim();
    if (!v) return;
    sendText.mutate(v);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 bg-black/20 px-4 py-3">
        <button
          onClick={onBack}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-secondary font-display text-sm ring-1 ring-secondary/30">
          {initials(counterpartName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-foreground">{counterpartName}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {convo.listing?.title}
            {convo.listing && (
              <>
                {" "}
                · ${Number(convo.listing.price).toFixed(2)}/{convo.listing.unit}
                {convo.listing.status !== "active" && (
                  <span className="ml-1 rounded bg-emerald-500/15 px-1 py-0.5 text-[9px] uppercase tracking-wide text-emerald-300">
                    {convo.listing.status}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {messages.isLoading && (
          <div className="text-center text-xs text-muted-foreground">Loading…</div>
        )}
        <AnimatePresence initial={false}>
          {messages.data?.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              mine={m.sender_id === currentUserId}
              isFarmer={isFarmer}
              onRespond={(status) =>
                respondOffer.mutate({ id: m.id, status })
              }
              counterpartName={counterpartName}
              unit={convo.listing?.unit ?? "unit"}
            />
          ))}
        </AnimatePresence>
        {messages.data?.length === 0 && (
          <div className="grid place-items-center py-10 text-center text-xs text-muted-foreground">
            Say hello to start the conversation.
          </div>
        )}
      </div>

      {/* Offer panel */}
      <AnimatePresence>
        {showOffer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5 bg-black/30"
          >
            <div className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Price (USD)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Quantity
                </label>
                <Input
                  type="number"
                  min={1}
                  value={offerQty}
                  onChange={(e) => setOfferQty(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => sendOffer.mutate()}
                  disabled={sendOffer.isPending}
                  className="flex-1"
                >
                  <HandCoins className="h-4 w-4" /> Send Offer
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowOffer(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer */}
      <form
        onSubmit={submitText}
        className="flex items-center gap-2 border-t border-white/5 bg-black/20 px-3 py-3"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowOffer((v) => !v)}
        >
          <HandCoins className="h-4 w-4" /> Offer
        </Button>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message…"
          className="flex-1"
        />
        <Button type="submit" disabled={!draft.trim() || sendText.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  mine,
  isFarmer,
  onRespond,
  counterpartName,
  unit,
}: {
  message: ChatMessage;
  mine: boolean;
  isFarmer: boolean;
  onRespond: (status: "accepted" | "declined") => void;
  counterpartName: string;
  unit: string;
}) {
  const isOffer = message.type === "offer";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex w-full", mine ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow",
          mine
            ? "bg-secondary/15 text-foreground ring-1 ring-secondary/30 rounded-br-sm"
            : "bg-white/[0.04] text-foreground ring-1 ring-white/5 rounded-bl-sm"
        )}
      >
        {!mine && (
          <div className="mb-0.5 text-[10px] uppercase tracking-wider text-secondary/80">
            {counterpartName}
          </div>
        )}
        {isOffer ? (
          <OfferCard
            message={message}
            mine={mine}
            canRespond={!mine && isFarmer && message.offer_status === "pending"}
            onRespond={onRespond}
            unit={unit}
          />
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        )}
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[10px]",
            mine ? "justify-end text-muted-foreground" : "text-muted-foreground"
          )}
        >
          <span>{formatTime(message.created_at)}</span>
          {mine &&
            (message.read_at ? (
              <CheckCheck className="h-3 w-3 text-secondary" />
            ) : (
              <Check className="h-3 w-3" />
            ))}
        </div>
      </div>
    </motion.div>
  );
}

function OfferCard({
  message,
  mine,
  canRespond,
  onRespond,
  unit,
}: {
  message: ChatMessage;
  mine: boolean;
  canRespond: boolean;
  onRespond: (status: "accepted" | "declined") => void;
  unit: string;
}) {
  const price = Number(message.offer_price ?? 0);
  const qty = Number(message.offer_quantity ?? 0);
  const status = message.offer_status ?? "pending";
  const total = price * qty;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-secondary">
        <HandCoins className="h-3 w-3" /> {mine ? "Your offer" : "New offer"}
      </div>
      <div className="rounded-xl border border-secondary/20 bg-black/30 p-3">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-2xl text-secondary">
            ${price.toFixed(2)}
          </span>
          <span className="text-xs text-muted-foreground">/ {unit}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {qty} {unit} · Total ${total.toFixed(2)}
        </div>
        <div className="mt-2 text-[10px] uppercase tracking-wider">
          {status === "pending" && (
            <span className="text-amber-300">Awaiting response</span>
          )}
          {status === "accepted" && (
            <span className="text-emerald-300">Accepted — listing marked sold</span>
          )}
          {status === "declined" && (
            <span className="text-rose-300">Declined</span>
          )}
        </div>
        {canRespond && (
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => onRespond("accepted")}
            >
              <Check className="h-3.5 w-3.5" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onRespond("declined")}
            >
              <X className="h-3.5 w-3.5" /> Decline
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function NewChatModal({
  open,
  onOpenChange,
  currentUserId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentUserId: string;
  onPick: (otherId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<
    Array<{ id: string; full_name: string; role: string; avatar_url: string | null }>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    setLoading(true);
    const t = setTimeout(async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, role, avatar_url")
        .neq("id", currentUserId)
        .limit(20);
      if (term) query = query.ilike("full_name", `%${term}%`);
      const { data, error } = await query;
      if (!error) setResults((data ?? []) as any);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q, open, currentUserId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start a new chat</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users to message..."
            className="pl-9"
          />
        </div>
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Searching…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No users found
            </div>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => onPick(u.id)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-white/5"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-secondary font-display text-sm ring-1 ring-secondary/30">
                {initials(u.full_name || "?")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">
                  {u.full_name || "Unnamed user"}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {u.role}
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
