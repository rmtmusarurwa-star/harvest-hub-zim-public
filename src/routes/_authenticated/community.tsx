import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  MessageSquare,
  Heart,
  Sparkles,
  Lightbulb,
  Plus,
  Search,
  TrendingUp,
  Image as ImageIcon,
  X,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FORUM_CATEGORIES, categoryLabel, type ForumPostRow } from "@/lib/forum-data";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community Forum — Harvest Hub Zimbabwe" },
      {
        name: "description",
        content:
          "Discuss farming, livestock, market trends, and share success stories with Zimbabwean farmers.",
      },
    ],
  }),
  component: CommunityPage,
});

type PostWithMeta = ForumPostRow & {
  author_name: string;
  author_avatar: string | null;
  comment_count: number;
  reaction_count: number;
  liked_by_me: boolean;
};

function CommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<"latest" | "trending">("latest");

  const load = async () => {
    setLoading(true);
    const { data: postsData, error } = await supabase
      .from("forum_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error("Could not load posts");
      setLoading(false);
      return;
    }
    const rows = (postsData ?? []) as ForumPostRow[];
    const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
    const postIds = rows.map((r) => r.id);

    const [{ data: profs }, { data: comments }, { data: reacts }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]),
      supabase
        .from("forum_comments")
        .select("post_id")
        .in("post_id", postIds.length ? postIds : ["00000000-0000-0000-0000-000000000000"]),
      supabase
        .from("forum_reactions")
        .select("post_id, user_id, type")
        .in("post_id", postIds.length ? postIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const profMap = new Map(
      (profs ?? []).map((p) => [p.id, { name: p.full_name, avatar: p.avatar_url }]),
    );
    const commentCounts = new Map<string, number>();
    (comments ?? []).forEach((c) =>
      commentCounts.set(c.post_id, (commentCounts.get(c.post_id) ?? 0) + 1),
    );
    const reactionCounts = new Map<string, number>();
    const likedByMe = new Set<string>();
    (reacts ?? []).forEach((r) => {
      reactionCounts.set(r.post_id, (reactionCounts.get(r.post_id) ?? 0) + 1);
      if (user && r.user_id === user.id && r.type === "like") likedByMe.add(r.post_id);
    });

    setPosts(
      rows.map((p) => ({
        ...p,
        author_name: profMap.get(p.author_id)?.name || "Farmer",
        author_avatar: profMap.get(p.author_id)?.avatar ?? null,
        comment_count: commentCounts.get(p.id) ?? 0,
        reaction_count: reactionCounts.get(p.id) ?? 0,
        liked_by_me: likedByMe.has(p.id),
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Debounce realtime bursts so a flurry of likes/comments doesn't re-fetch repeatedly
    let t: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => load(), 600);
    };
    const channel = supabase
      .channel("forum-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_posts" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_comments" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_reactions" }, schedule)
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const filtered = useMemo(() => {
    let list = [...posts];
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          p.author_name.toLowerCase().includes(q),
      );
    }
    if (sort === "trending") {
      list.sort(
        (a, b) => b.reaction_count + b.comment_count * 2 - (a.reaction_count + a.comment_count * 2),
      );
    }
    return list;
  }, [posts, category, search, sort]);

  const trendingTopics = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((p) => counts.set(p.category, (counts.get(p.category) ?? 0) + 1));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [posts]);

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-secondary/80">
              Community
            </span>
          </div>
          <h1 className="font-display text-3xl leading-tight md:text-5xl">
            <MessageSquare className="mr-2 inline h-7 w-7 text-secondary" />
            Knowledge travels faster together.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Share knowledge with the Zimbabwean farming community.
          </p>
        </div>
        {user && <CreatePostDialog onCreated={load} />}
      </motion.div>

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        {/* Feed */}
        <div className="space-y-4">
          {/* Controls */}
          <div className="glass space-y-3 rounded-2xl border border-white/5 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search posts, authors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {FORUM_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tabs value={sort} onValueChange={(v) => setSort(v as "latest" | "trending")}>
                <TabsList>
                  <TabsTrigger value="latest">Latest</TabsTrigger>
                  <TabsTrigger value="trending" className="gap-1">
                    <TrendingUp className="h-3.5 w-3.5" /> Trending
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {loading ? (
            <div className="glass rounded-2xl border border-white/5 py-12 text-center text-muted-foreground">
              Loading posts...
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-2xl border border-white/5 py-12 text-center">
              <MessageSquare className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
              <div className="font-display text-lg">No posts yet</div>
              <p className="text-sm text-muted-foreground">Be the first to start a conversation.</p>
            </div>
          ) : (
            filtered.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 6) * 0.04 }}
              >
                <PostCard post={p} onChanged={load} />
              </motion.div>
            ))
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-2xl border border-white/5 p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-secondary" />
              <div className="font-display text-sm">Trending Topics</div>
            </div>
            {trendingTopics.length === 0 ? (
              <p className="text-xs text-muted-foreground">No topics yet — start a discussion!</p>
            ) : (
              <div className="space-y-1.5">
                {trendingTopics.map(([cat, count]) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-foreground transition hover:bg-white/[0.04]"
                  >
                    <span>{categoryLabel(cat)}</span>
                    <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[11px] text-secondary">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl border border-white/5 p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-secondary" />
              <div className="font-display text-sm">Categories</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FORUM_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    category === c.value
                      ? "border-secondary/40 bg-secondary/15 text-secondary"
                      : "border-white/10 text-muted-foreground hover:bg-white/[0.04]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </motion.div>
        </aside>
      </div>
    </section>
  );
}

function PostCard({ post, onChanged }: { post: PostWithMeta; onChanged: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.reaction_count);

  useEffect(() => {
    setLiked(post.liked_by_me);
    setLikeCount(post.reaction_count);
  }, [post.liked_by_me, post.reaction_count]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return toast.error("Sign in to react");
    if (busy) return;
    setBusy(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));
    const { error } = wasLiked
      ? await supabase
          .from("forum_reactions")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .eq("type", "like")
      : await supabase
          .from("forum_reactions")
          .insert({ post_id: post.id, user_id: user.id, type: "like" });
    setBusy(false);
    if (error) {
      // Revert
      setLiked(wasLiked);
      setLikeCount((c) => Math.max(0, c + (wasLiked ? 1 : -1)));
      toast.error(error.message || "Could not update like");
    }
    // Realtime subscription will reconcile counts; no need to force a reload here.
  };

  return (
    <div className="glass rounded-2xl border border-white/5 p-4 transition hover:border-secondary/30">
      <div className="flex items-start gap-3">
        <Link to="/farmers/$farmerId" params={{ farmerId: post.author_id }} className="shrink-0">
          {post.author_avatar ? (
            <img
              src={post.author_avatar}
              alt=""
              className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary/15 font-display text-sm text-secondary ring-1 ring-white/10">
              {post.author_name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link
              to="/farmers/$farmerId"
              params={{ farmerId: post.author_id }}
              className="font-medium text-foreground hover:text-secondary"
            >
              {post.author_name}
            </Link>
            <span>·</span>
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
            <span className="ml-auto rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] text-secondary">
              {categoryLabel(post.category)}
            </span>
          </div>
          <Link to="/community/$postId" params={{ postId: post.id }} className="mt-1.5 block">
            <h3 className="font-display text-base leading-snug transition hover:text-secondary">
              {post.title}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{post.body}</p>
          </Link>
          {post.image_url && (
            <Link to="/community/$postId" params={{ postId: post.id }} className="mt-2 block">
              <img
                src={post.image_url}
                alt=""
                className="max-h-48 w-full rounded-xl border border-white/5 object-cover"
              />
            </Link>
          )}
          <div className="-ml-2 mt-3 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLike}
              disabled={busy}
              className={`tap-bounce h-8 gap-1.5 ${liked ? "text-secondary" : "text-muted-foreground"}`}
            >
              <Heart
                className={`h-4 w-4 transition-transform ${liked ? "fill-current scale-110" : ""}`}
              />
              <span className="text-xs">{likeCount}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate({
                  to: "/community/$postId",
                  params: { postId: post.id },
                  hash: "comments",
                })
              }
              className="h-8 gap-1.5 text-muted-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs">{post.comment_count}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreatePostDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!title.trim() || title.length > 160) {
      toast.error("Title is required (max 160 chars)");
      return;
    }
    if (!body.trim() || body.length > 5000) {
      toast.error("Body is required (max 5000 chars)");
      return;
    }
    setSubmitting(true);
    try {
      let image_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("forum-images")
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("forum-images").getPublicUrl(path);
        image_url = data.publicUrl;
      }
      const { error } = await supabase.from("forum_posts").insert({
        author_id: user.id,
        title: title.trim(),
        category: category as ForumPostRow["category"],
        body: body.trim(),
        image_url,
      });
      if (error) throw error;
      toast.success("Post created");
      setTitle("");
      setBody("");
      setFile(null);
      setCategory("general");
      setOpen(false);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <Plus className="h-4 w-4" /> New Post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a discussion</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ask a question or share an update..."
            />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORUM_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Body</Label>
            <Textarea
              maxLength={5000}
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share details, ask for advice, post a success story..."
            />
          </div>
          <div className="space-y-1">
            <Label>Image (optional)</Label>
            {file ? (
              <div className="flex items-center justify-between bg-muted rounded px-3 py-2 text-sm">
                <span className="truncate">{file.name}</span>
                <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer text-sm border border-dashed rounded px-3 py-2 hover:bg-muted/50">
                <ImageIcon className="h-4 w-4" />
                <span>Choose image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size > 5 * 1024 * 1024) {
                      toast.error("Image must be under 5MB");
                      return;
                    }
                    setFile(f ?? null);
                  }}
                />
              </label>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Posting..." : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { Heart, Sparkles, Lightbulb };
