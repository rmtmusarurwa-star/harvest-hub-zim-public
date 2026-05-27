import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  component: EditProfilePage,
});

const MAX_SIZE = 5 * 1024 * 1024;
const MAX_BIO = 500;

async function compressImage(file: File): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });
  const max = 600;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((res) =>
    canvas.toBlob((b) => res(b!), "image/jpeg", 0.85),
  );
}

function EditProfilePage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [farmName, setFarmName] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [province, setProvince] = useState("");
  const [farmerBio, setFarmerBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);

  const isFarmer = profile?.role === "farmer";

  const { data: farmerDetails } = useQuery({
    queryKey: ["farmer-details", user?.id],
    enabled: !!user && isFarmer,
    queryFn: async () => {
      const { data } = await supabase
        .from("farmer_details")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
      setPhone(profile.phone || "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  useEffect(() => {
    if (farmerDetails) {
      setFarmName(farmerDetails.farm_name || "");
      setFarmLocation(farmerDetails.farm_location || "");
      setSpeciality(farmerDetails.speciality || "");
      setProvince(farmerDetails.province || "");
      setFarmerBio(farmerDetails.bio || "");
    }
  }, [farmerDetails]);

  async function handleFile(file: File | null) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      toast.error("Only JPG or PNG images allowed");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Image must be under 5MB");
      return;
    }
    try {
      const blob = await compressImage(file);
      setPendingBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      toast.error("Could not process image");
    }
  }

  async function handleSave() {
    if (!user) return;
    if (bio.length > MAX_BIO) {
      toast.error(`Bio must be under ${MAX_BIO} characters`);
      return;
    }
    if (!fullName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      let newAvatarUrl = avatarUrl;
      if (pendingBlob) {
        const path = `${user.id}/avatar-${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, pendingBlob, {
            cacheControl: "3600",
            upsert: true,
            contentType: "image/jpeg",
          });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        newAvatarUrl = data.publicUrl;
      }

      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          bio: bio.trim(),
          location: location.trim(),
          phone: phone.trim(),
          avatar_url: newAvatarUrl,
        })
        .eq("id", user.id);
      if (pErr) throw pErr;

      if (isFarmer) {
        const { error: fErr } = await supabase
          .from("farmer_details")
          .upsert(
            {
              user_id: user.id,
              farm_name: farmName.trim(),
              farm_location: farmLocation.trim(),
              speciality: speciality.trim(),
              province: province.trim(),
              bio: farmerBio.trim(),
            },
            { onConflict: "user_id" },
          );
        if (fErr) throw fErr;
      }

      await qc.invalidateQueries();
      toast.success("Profile saved successfully");
      navigate({ to: "/profile/$userId", params: { userId: user.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  const displayAvatar = previewUrl || avatarUrl;
  const initials = (fullName || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/profile/$userId"
        params={{ userId: user?.id ?? "" }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </Link>

      <div>
        <h1 className="font-display text-3xl">Edit profile</h1>
        <p className="text-sm text-muted-foreground">
          Update your personal information and how others see you.
        </p>
      </div>

      <div className="glass-strong rounded-2xl p-6 space-y-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 transition ${
            dragOver ? "border-secondary bg-secondary/5" : "border-white/10"
          }`}
        >
          <div className="relative">
            <Avatar className="h-[200px] w-[200px] ring-2 ring-secondary/30">
              {displayAvatar && <AvatarImage src={displayAvatar} alt={fullName} />}
              <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-lg hover:scale-105 transition"
              aria-label="Change photo"
            >
              <Camera className="h-4 w-4" />
            </button>
            {previewUrl && (
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  setPendingBlob(null);
                }}
                className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground"
                aria-label="Discard new photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Upload photo
          </Button>
          <p className="text-xs text-muted-foreground">
            Drag & drop or click. JPG/PNG, max 5MB. Auto-compressed.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full name *</Label>
            <Input
              id="name"
              value={fullName}
              maxLength={120}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location (city, region)</Label>
            <Input
              id="location"
              value={location}
              maxLength={120}
              placeholder="Harare, Zimbabwe"
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="phone">Contact phone</Label>
            <Input
              id="phone"
              value={phone}
              maxLength={32}
              placeholder="+263 77 123 4567"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio">Bio / Description</Label>
              <span className="text-xs text-muted-foreground">
                {bio.length}/{MAX_BIO}
              </span>
            </div>
            <Textarea
              id="bio"
              value={bio}
              maxLength={MAX_BIO}
              rows={4}
              placeholder="Tell others a bit about yourself…"
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
        </div>

        {isFarmer && (
          <div className="space-y-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div>
              <h2 className="font-display text-lg">Farm / Business details</h2>
              <p className="text-xs text-muted-foreground">
                Shown on your seller profile.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="farm_name">Farm / Business name</Label>
                <Input
                  id="farm_name"
                  value={farmName}
                  maxLength={120}
                  onChange={(e) => setFarmName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farm_location">Farm location</Label>
                <Input
                  id="farm_location"
                  value={farmLocation}
                  maxLength={200}
                  placeholder="Goromonzi, Mashonaland East"
                  onChange={(e) => setFarmLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Input
                  id="province"
                  value={province}
                  maxLength={80}
                  onChange={(e) => setProvince(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="speciality">Specialities</Label>
                <Input
                  id="speciality"
                  value={speciality}
                  maxLength={200}
                  placeholder="Grains, Livestock, Horticulture"
                  onChange={(e) => setSpeciality(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="farmer_bio">Farm bio</Label>
                <Textarea
                  id="farmer_bio"
                  value={farmerBio}
                  rows={3}
                  maxLength={500}
                  onChange={(e) => setFarmerBio(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() =>
              navigate({ to: "/profile/$userId", params: { userId: user?.id ?? "" } })
            }
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </div>
    </section>
  );
}
