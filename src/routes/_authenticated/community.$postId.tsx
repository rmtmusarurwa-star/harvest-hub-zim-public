import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft,
  MessageSquare,
  Send,
  ThumbsUp,
  Sparkles,
  Lightbulb,
  Trash2,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { uid } from "@/lib/utils";
import { toast } from "sonner";
import {
  REACTION_TYPES,
  categoryLabel,
  type ForumCommentRow,
  type ForumPostRow,
  type ForumReactionType,
} from "@/lib/forum-data";

export const Route = createFileRoute("/_authenticated/community/$postId")({
  component: PostDetailPage,
});

type Profile = { id: string; full_name: string; avatar_url: string | null };

function PostDetailPage() {
  const { postId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<ForumPostRow | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [comments, setComments] = useState<ForumCommentRow[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, Profile>>({});
  const [commentLikes, setCommentLikes] = useState<
    Record<string, { count: number; mine: boolean }>
  >({});
  const [reactions, setReactions] = useState<
    { type: ForumReactionType; count: number; mine: boolean }[]
  >([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: p, error } = await supabase
      .from("forum_posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();
    if (error || !p) {
      toast.error("Post not found");
      setLoading(false);
      return;
    }
    setPost(p as ForumPostRow);

    const [{ data: authorProf }, { data: commentRows }, { data: reactRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", (p as ForumPostRow).author_id)
        .maybeSingle(),
      supabase
        .from("forum_comments")
        .select("*")
        .eq("post_id", postId)
        .eq("deleted", false)
        .order("created_at", { ascending: true }),
      supabase.from("forum_reactions").select("type, user_id").eq("post_id", postId),
    ]);

    setAuthor((authorProf as Profile) ?? null);
    const cmts = (commentRows ?? []) as ForumCommentRow[];
    setComments(cmts);

    const cmtAuthorIds = Array.from(new Set(cmts.map((c) => c.author_id)));
    if (cmtAuthorIds.length) {
      const { data: cmtProfs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", cmtAuthorIds);
      const map: Record<string, Profile> = {};
      (cmtProfs ?? []).forEach((pp) => (map[pp.id] = pp as Profile));
      setCommentAuthors(map);
    }

    // Load likes for these comments
    const cmtIds = cmts.map((c) => c.id);
    if (cmtIds.length) {
      const { data: likeRows } = await (supabase as any)
        .from("forum_comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", cmtIds);
      const likeMap: Record<string, { count: number; mine: boolean }> = {};
      cmtIds.forEach((id) => (likeMap[id] = { count: 0, mine: false }));
      (likeRows ?? []).forEach((r: { comment_id: string; user_id: string }) => {
        const entry = likeMap[r.comment_id];
        if (!entry) return;
        entry.count += 1;
        if (user && r.user_id === user.id) entry.mine = true;
      });
      setCommentLikes(likeMap);
    } else {
      setCommentLikes({});
    }

    const grouped = REACTION_TYPES.map((t) => {
      const matching = (reactRows ?? []).filter((r) => r.type === t.value);
      return {
        type: t.value,
        count: matching.length,
        mine: !!user && matching.some((r) => r.user_id === user.id),
      };
    });
    setReactions(grouped);
    setLoading(false);
  };

  useEffect(() => {
    load();
    let t: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => load(), 500);
    };
    const channel = supabase
      .channel(`forum-post-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forum_comments", filter: `post_id=eq.${postId}` },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forum_reactions", filter: `post_id=eq.${postId}` },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forum_comment_likes" },
        schedule,
      )
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, user?.id]);

  const toggleReaction = async (type: ForumReactionType, mine: boolean) => {
    if (!user) return toast.error("Sign in to react");
    // Optimistic update
    setReactions((prev) =>
      prev.map((r) =>
        r.type === type ? { ...r, mine: !mine, count: Math.max(0, r.count + (mine ? -1 : 1)) } : r,
      ),
    );
    const { error } = mine
      ? await supabase
          .from("forum_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .eq("type", type)
      : await supabase.from("forum_reactions").insert({ post_id: postId, user_id: user.id, type });
    if (error) {
      toast.error(error.message || "Could not update reaction");
      load();
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!user) return toast.error("Sign in to like");
    const cur = commentLikes[commentId] ?? { count: 0, mine: false };
    const next = {
      count: Math.max(0, cur.count + (cur.mine ? -1 : 1)),
      mine: !cur.mine,
    };
    setCommentLikes((prev) => ({ ...prev, [commentId]: next }));
    const { error } = cur.mine
      ? await (supabase as any)
          .from("forum_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
      : await (supabase as any)
          .from("forum_comment_likes")
          .insert({ comment_id: commentId, user_id: user.id });
    if (error) {
      setCommentLikes((prev) => ({ ...prev, [commentId]: cur }));
      toast.error(error.message || "Could not update like");
    }
  };

  const submitComment = async () => {
    if (!user || !reply.trim()) return;
    if (reply.length > 2000) {
      toast.error("Comment too long (max 2000)");
      return;
    }
    setSubmitting(true);
    const content = reply.trim();
    // Optimistic insert so the comment appears instantly
    const tempId = `temp-${uid()}`;
    const optimistic: ForumCommentRow = {
      id: tempId,
      post_id: postId,
      author_id: user.id,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted: false,
    };
    setComments((prev) => [...prev, optimistic]);
    if (user.id && !commentAuthors[user.id]) {
      const { data: me } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (me) setCommentAuthors((m) => ({ ...m, [user.id]: me as Profile }));
    }
    setReply("");
    const { data, error } = await supabase
      .from("forum_comments")
      .insert({ post_id: postId, author_id: user.id, content })
      .select("*")
      .single();
    setSubmitting(false);
    if (error || !data) {
      console.error("Comment insert failed:", error);
      toast.error(error?.message || "Could not post comment");
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setReply(content);
      return;
    }
    // Swap the optimistic row for the real one
    setComments((prev) => prev.map((c) => (c.id === tempId ? (data as ForumCommentRow) : c)));
  };

  const deleteComment = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    // Optimistic remove
    setComments((prev) => prev.filter((c) => c.id !== id));
    const { error } = await supabase.from("forum_comments").update({ deleted: true }).eq("id", id);
    if (error) {
      toast.error("Could not delete");
      load();
    }
  };

  const saveCommentEdit = async (id: string, content: string): Promise<boolean> => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Comment cannot be empty");
      return false;
    }
    if (trimmed.length > 2000) {
      toast.error("Comment too long (max 2000)");
      return false;
    }
    const { error } = await supabase
      .from("forum_comments")
      .update({ content: trimmed })
      .eq("id", id);
    if (error) {
      toast.error(error.message || "Could not save edit");
      return false;
    }
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, content: trimmed } : c)));
    return true;
  };

  const reactionIcon = (t: ForumReactionType) =>
    t === "like" ? (
      <ThumbsUp className="h-4 w-4" />
    ) : t === "helpful" ? (
      <Sparkles className="h-4 w-4" />
    ) : (
      <Lightbulb className="h-4 w-4" />
    );

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-10 text-center text-muted-foreground">Loading...</div>
    );
  }
  if (!post) {
    return (
      <div className="mx-auto max-w-3xl py-10 text-center">
        <p className="mb-4 text-muted-foreground">Post not found.</p>
        <Button variant="secondary" onClick={() => navigate({ to: "/community" })}>
          Back to forum
        </Button>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-muted-foreground hover:text-secondary"
        onClick={() => navigate({ to: "/community" })}
      >
        <ArrowLeft className="h-4 w-4" /> Back to forum
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl border border-white/5 p-5"
      >
        <div className="mb-3 flex items-start gap-3">
          <Link to="/farmers/$farmerId" params={{ farmerId: post.author_id }}>
            {author?.avatar_url ? (
              <img
                src={author.avatar_url}
                alt=""
                className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10"
              />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary/15 font-display text-base text-secondary ring-1 ring-white/10">
                {(author?.full_name ?? "U").slice(0, 2).toUpperCase()}
              </span>
            )}
          </Link>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/farmers/$farmerId"
                params={{ farmerId: post.author_id }}
                className="font-medium text-foreground hover:text-secondary"
              >
                {author?.full_name || "Farmer"}
              </Link>
              <span className="text-xs text-muted-foreground">
                {new Date(post.created_at).toLocaleString()}
              </span>
              <span className="ml-auto rounded-full bg-secondary/15 px-2.5 py-0.5 text-[11px] text-secondary">
                {categoryLabel(post.category)}
              </span>
            </div>
          </div>
        </div>

        <h1 className="font-display text-2xl leading-tight">{post.title}</h1>
        <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {post.body}
        </div>
        {post.image_url && (
          <img
            src={post.image_url}
            alt=""
            className="mt-4 max-h-[420px] w-full rounded-xl border border-white/5 object-cover"
          />
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
          {reactions.map((r) => (
            <Button
              key={r.type}
              variant={r.mine ? "secondary" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => toggleReaction(r.type, r.mine)}
            >
              {reactionIcon(r.type)}
              <span className="capitalize">{r.type}</span>
              <span className="text-xs opacity-80">{r.count}</span>
            </Button>
          ))}
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" /> {comments.length} comments
          </span>
        </div>
      </motion.div>

      {/* Reply input */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          id="comments"
          className="glass scroll-mt-24 space-y-2 rounded-2xl border border-white/5 p-4"
        >
          <Textarea
            placeholder="Add a thoughtful reply..."
            value={reply}
            maxLength={2000}
            rows={3}
            onChange={(e) => setReply(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{reply.length}/2000</span>
            <Button
              variant="secondary"
              onClick={submitComment}
              disabled={submitting || !reply.trim()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Posting..." : "Reply"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Comments */}
      <div className="space-y-3">
        <h2 className="font-display text-lg">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </h2>
        {comments.length === 0 ? (
          <div className="glass rounded-2xl border border-white/5 py-8 text-center text-sm text-muted-foreground">
            No comments yet — be the first to reply.
          </div>
        ) : (
          comments.map((c, i) => {
            const ca = commentAuthors[c.author_id];
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 6) * 0.04 }}
              >
                <CommentItem
                  comment={c}
                  profile={ca}
                  isOwn={user?.id === c.author_id}
                  like={commentLikes[c.id] ?? { count: 0, mine: false }}
                  onToggleLike={() => toggleCommentLike(c.id)}
                  onDelete={() => deleteComment(c.id)}
                  onSave={(val) => saveCommentEdit(c.id, val)}
                />
              </motion.div>
            );
          })
        )}
      </div>
    </section>
  );
}

function CommentItem({
  comment,
  profile,
  isOwn,
  like,
  onToggleLike,
  onDelete,
  onSave,
}: {
  comment: ForumCommentRow;
  profile: Profile | undefined;
  isOwn: boolean;
  like: { count: number; mine: boolean };
  onToggleLike: () => void;
  onDelete: () => void;
  onSave: (val: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  return (
    <div className="glass rounded-2xl border border-white/5 p-4">
      <div className="flex items-start gap-3">
        <Link to="/farmers/$farmerId" params={{ farmerId: comment.author_id }}>
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary/15 font-display text-xs text-secondary ring-1 ring-white/10">
              {(profile?.full_name ?? "U").slice(0, 2).toUpperCase()}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs">
            <Link
              to="/farmers/$farmerId"
              params={{ farmerId: comment.author_id }}
              className="font-medium text-foreground hover:text-secondary"
            >
              {profile?.full_name || "Farmer"}
            </Link>
            <span className="text-muted-foreground">
              {new Date(comment.created_at).toLocaleString()}
            </span>
            {isOwn && !editing && (
              <div className="ml-auto flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-secondary"
                  onClick={() => {
                    setDraft(comment.content);
                    setEditing(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-rose-400"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={draft}
                rows={3}
                maxLength={2000}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    setSaving(true);
                    const ok = await onSave(draft);
                    setSaving(false);
                    if (ok) setEditing(false);
                  }}
                  disabled={saving || !draft.trim()}
                >
                  <Check className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                {comment.content}
              </p>
              <div className="mt-2">
                <Button
                  variant={like.mine ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 gap-1.5 px-2"
                  onClick={onToggleLike}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span className="text-xs">{like.count}</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
