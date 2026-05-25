import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  FORUM_CATEGORIES,
  categoryLabel,
  type ForumPostRow,
} from "@/lib/forum-data";

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

    const [{ data: profs }, { data: comments }, { data: reacts }] =
      await Promise.all([
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
      (profs ?? []).map((p) => [p.id, { name: p.full_name, avatar: p.avatar_url }])
    );
    const commentCounts = new Map<string, number>();
    (comments ?? []).forEach((c) =>
      commentCounts.set(c.post_id, (commentCounts.get(c.post_id) ?? 0) + 1)
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
      }))
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
          p.author_name.toLowerCase().includes(q)
      );
    }
    if (sort === "trending") {
      list.sort(
        (a, b) =>
          b.reaction_count + b.comment_count * 2 -
          (a.reaction_count + a.comment_count * 2)
      );
    }
    return list;
  }, [posts, category, search, sort]);

  const trendingTopics = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((p) =>
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
    );
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [posts]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" />
            Community Forum
          </h1>
          <p className="text-muted-foreground text-sm">
            Share knowledge with the Zimbabwean farming community.
          </p>
        </div>
        {user && <CreatePostDialog onCreated={load} />}
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-6">
        {/* Feed */}
        <div className="space-y-4">
          {/* Controls */}
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search posts, authors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
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
                <Tabs
                  value={sort}
                  onValueChange={(v) => setSort(v as "latest" | "trending")}
                >
                  <TabsList>
                    <TabsTrigger value="latest">Latest</TabsTrigger>
                    <TabsTrigger value="trending" className="gap-1">
                      <TrendingUp className="h-3.5 w-3.5" /> Trending
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading posts...
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <div className="font-semibold">No posts yet</div>
                <p className="text-sm text-muted-foreground">
                  Be the first to start a conversation.
                </p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((p) => <PostCard key={p.id} post={p} onChanged={load} />)
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div className="font-semibold text-sm">Trending Topics</div>
              </div>
              {trendingTopics.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No topics yet — start a discussion!
                </p>
              ) : (
                <div className="space-y-2">
                  {trendingTopics.map(([cat, count]) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className="w-full flex items-center justify-between text-sm hover:bg-muted/50 rounded px-2 py-1.5 transition"
                    >
                      <span>{categoryLabel(cat)}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="font-semibold text-sm mb-2">Categories</div>
              <div className="flex flex-wrap gap-1.5">
                {FORUM_CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`text-xs px-2 py-1 rounded-full border transition ${
                      category === c.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
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
    } else {
      onChanged();
    }
  };

  return (
    <Card className="hover:border-primary/40 transition">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Link
            to="/farmers/$farmerId"
            params={{ farmerId: post.author_id }}
            className="shrink-0"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author_avatar ?? undefined} />
              <AvatarFallback>
                {post.author_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <Link
                to="/farmers/$farmerId"
                params={{ farmerId: post.author_id }}
                className="font-medium text-foreground hover:underline"
              >
                {post.author_name}
              </Link>
              <span>·</span>
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {categoryLabel(post.category)}
              </Badge>
            </div>
            <Link
              to="/community/$postId"
              params={{ postId: post.id }}
              className="block mt-1.5"
            >
              <h3 className="font-semibold text-base hover:text-primary transition">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {post.body}
              </p>
            </Link>
            {post.image_url && (
              <Link
                to="/community/$postId"
                params={{ postId: post.id }}
                className="block mt-2"
              >
                <img
                  src={post.image_url}
                  alt=""
                  className="rounded-md max-h-48 object-cover w-full"
                />
              </Link>
            )}
            <div className="flex items-center gap-1 mt-3 -ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLike}
                disabled={busy}
                className={`gap-1.5 h-8 ${liked ? "text-primary" : "text-muted-foreground"}`}
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
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
                className="gap-1.5 h-8 text-muted-foreground"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs">{post.comment_count}</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
        <Button className="gap-2">
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
