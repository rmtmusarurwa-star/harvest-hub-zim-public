export type MessageType = "text" | "offer" | "image" | "voice";
export type OfferStatus = "pending" | "accepted" | "declined";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: MessageType;
  content: string;
  offer_price: number | null;
  offer_quantity: number | null;
  offer_status: OfferStatus | null;
  media_url: string | null;
  media_duration_seconds: number | null;
  read_at: string | null;
  created_at: string;
};

export type ChatConversation = {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  farmer_id: string;
  last_message_at: string | null;
  created_at: string;
  deleted_for_buyer: boolean;
  deleted_for_farmer: boolean;
};

export type ConversationWithMeta = ChatConversation & {
  listing: {
    id: string;
    title: string;
    price: number;
    unit: string;
    image_url: string | null;
    status: string;
  } | null;
  counterpart: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  last_message: ChatMessage | null;
  unread_count: number;
};

export function initials(name: string) {
  return (name || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
