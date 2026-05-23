import type { Database } from "@/integrations/supabase/types";

export type ForumPostRow = Database["public"]["Tables"]["forum_posts"]["Row"];
export type ForumCommentRow = Database["public"]["Tables"]["forum_comments"]["Row"];
export type ForumReactionRow = Database["public"]["Tables"]["forum_reactions"]["Row"];
export type ForumCategory = Database["public"]["Enums"]["forum_category"];
export type ForumReactionType = Database["public"]["Enums"]["forum_reaction_type"];

export const FORUM_CATEGORIES: { value: ForumCategory; label: string }[] = [
  { value: "general", label: "General Farming" },
  { value: "livestock", label: "Livestock" },
  { value: "crops", label: "Crops" },
  { value: "market", label: "Market Talk" },
  { value: "equipment", label: "Equipment" },
  { value: "weather", label: "Weather & Climate" },
  { value: "success", label: "Success Stories" },
  { value: "help", label: "Help & Advice" },
];

export const categoryLabel = (value: string): string =>
  FORUM_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export const REACTION_TYPES: {
  value: ForumReactionType;
  label: string;
}[] = [
  { value: "like", label: "Like" },
  { value: "helpful", label: "Helpful" },
  { value: "insightful", label: "Insightful" },
];
