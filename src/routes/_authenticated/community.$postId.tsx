import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

    const [{ data: authorProf }, { data: commentRows }, { data: reactRows }] =
      await Promise.all([
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
        supabase
          .from("forum_reactions")
          .select("type, user_id")
          .eq("post_id", postId),
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
        schedule
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forum_reactions", filter: `post_id=eq.${postId}` },
        schedule
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forum_comment_likes" },
        schedule
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
        r.type === type
          ? { ...r, mine: !mine, count: Math.max(0, r.count + (mine ? -1 : 1)) }
          : r
      )
    );
    const { error } = mine
      ? await supabase
          .from("forum_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .eq("type", type)
      : await supabase
          .from("forum_reactions")
          .insert({ post_id: postId, user_id: user.id, type });
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
    const tempId = `temp-${crypto.randomUUID()}`;
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
    setComments((prev) =>
      prev.map((c) => (c.id === tempId ? (data as ForumCommentRow) : c))
    );
  };


  const deleteComment = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    // Optimistic remove
    setComments((prev) => prev.filter((c) => c.id !== id));
    const { error } = await supabase
      .from("forum_comments")
      .update({ deleted: true })
      .eq("id", id);
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
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, content: trimmed } : c))
    );
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
      <div className="container max-w-3xl mx-auto py-10 text-center text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!post) {
    return (
      <div className="container max-w-3xl mx-auto py-10 text-center">
        <p className="text-muted-foreground mb-4">Post not found.</p>
        <Button onClick={() => navigate({ to: "/community" })}>
          Back to forum
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 gap-1"
        onClick={() => navigate({ to: "/community" })}
      >
        <ArrowLeft className="h-4 w-4" /> Back to forum
      </Button>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <Link
              to="/farmers/$farmerId"
              params={{ farmerId: post.author_id }}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={author?.avatar_url ?? undefined} />
                <AvatarFallback>
                  {(author?.full_name ?? "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to="/farmers/$farmerId"
                  params={{ farmerId: post.author_id }}
                  className="font-semibold hover:underline"
                >
                  {author?.full_name || "Farmer"}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleString()}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  {categoryLabel(post.category)}
                </Badge>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {post.body}
          </div>
          {post.image_url && (
            <img
              src={post.image_url}
              alt=""
              className="mt-4 rounded-lg max-h-[420px] object-cover w-full"
            />
          )}

          <div className="flex items-center gap-2 mt-5 pt-4 border-t flex-wrap">
            {reactions.map((r) => (
              <Button
                key={r.type}
                variant={r.mine ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => toggleReaction(r.type, r.mine)}
              >
                {reactionIcon(r.type)}
                <span className="capitalize">{r.type}</span>
                <span className="text-xs opacity-80">{r.count}</span>
              </Button>
            ))}
            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> {comments.length}{" "}
              comments
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Reply input */}
      {user && (
        <Card id="comments" className="mt-4 scroll-mt-24">
          <CardContent className="p-4 space-y-2">
            <Textarea
              placeholder="Add a thoughtful reply..."
              value={reply}
              maxLength={2000}
              rows={3}
              onChange={(e) => setReply(e.target.value)}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {reply.length}/2000
              </span>
              <Button
                onClick={submitComment}
                disabled={submitting || !reply.trim()}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Posting..." : "Reply"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <div className="mt-4 space-y-3">
        <h2 className="font-semibold text-lg">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </h2>
        {comments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No comments yet — be the first to reply.
            </CardContent>
          </Card>
        ) : (
          comments.map((c) => {
            const ca = commentAuthors[c.author_id];
            return (
              <CommentItem
                key={c.id}
                comment={c}
                profile={ca}
                isOwn={user?.id === c.author_id}
                onDelete={() => deleteComment(c.id)}
                onSave={(val) => saveCommentEdit(c.id, val)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  profile,
  isOwn,
  onDelete,
  onSave,
}: {
  comment: ForumCommentRow;
  profile: Profile | undefined;
  isOwn: boolean;
  onDelete: () => void;
  onSave: (val: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Link to="/farmers/$farmerId" params={{ farmerId: comment.author_id }}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback>
                {(profile?.full_name ?? "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <Link
                to="/farmers/$farmerId"
                params={{ farmerId: comment.author_id }}
                className="font-semibold hover:underline"
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
                    className="h-6 w-6"
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
                    className="h-6 w-6"
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
              <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
