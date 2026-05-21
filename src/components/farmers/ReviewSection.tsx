import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { initials, type ReviewRow } from "@/lib/farmers-data";

type ReviewWithAuthor = ReviewRow & {
  author?: { full_name: string; avatar_url: string | null } | null;
};

export function ReviewSection({ farmerId }: { farmerId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  const isMock = farmerId.startsWith("mock-");

  const { data: reviews = [] } = useQuery({
    queryKey: ["farmer-reviews", farmerId],
    enabled: !isMock,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farmer_reviews")
        .select("*")
        .eq("farmer_id", farmerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as ReviewRow[];
      const authorIds = Array.from(new Set(rows.map((r) => r.reviewer_id)));
      let authors: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (authorIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", authorIds);
        authors = Object.fromEntries(
          (profs ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]),
        );
      }
      return rows.map((r) => ({ ...r, author: authors[r.reviewer_id] ?? null })) as ReviewWithAuthor[];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to leave a review.");
      const { error } = await supabase.from("farmer_reviews").upsert(
        {
          farmer_id: farmerId,
          reviewer_id: user.id,
          rating,
          comment: comment.trim(),
        },
        { onConflict: "farmer_id,reviewer_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review posted");
      setComment("");
      qc.invalidateQueries({ queryKey: ["farmer-reviews", farmerId] });
      qc.invalidateQueries({ queryKey: ["farmer-detail", farmerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canReview = !!user && user.id !== farmerId && !isMock;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-foreground">Reviews</h2>
        <span className="text-xs text-muted-foreground">
          {reviews.length} review{reviews.length === 1 ? "" : "s"}
        </span>
      </div>

      {canReview && (
        <div className="glass rounded-2xl p-4">
          <p className="mb-2 text-sm text-muted-foreground">Rate this farmer</p>
          <div className="mb-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="p-0.5"
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
              >
                <Star
                  className={`h-6 w-6 transition ${
                    (hover || rating) >= n
                      ? "fill-secondary text-secondary"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience trading with this farmer…"
            rows={3}
          />
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              disabled={submit.isPending || !comment.trim()}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? "Posting…" : "Post review"}
            </Button>
          </div>
        </div>
      )}

      {isMock && (
        <p className="rounded-xl border border-white/5 bg-surface2/40 p-4 text-sm text-muted-foreground">
          Reviews unlock once this farmer activates their profile.
        </p>
      )}

      <div className="space-y-3">
        {reviews.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-surface2 text-xs text-secondary">
                {initials(r.author?.full_name ?? "User")}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {r.author?.full_name || "Verified buyer"}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-3.5 w-3.5 ${
                        n <= r.rating ? "fill-secondary text-secondary" : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                {r.comment && (
                  <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {!reviews.length && !isMock && (
          <p className="rounded-xl border border-white/5 bg-surface2/40 p-4 text-sm text-muted-foreground">
            No reviews yet. Be the first to share your experience.
          </p>
        )}
      </div>
    </div>
  );
}
