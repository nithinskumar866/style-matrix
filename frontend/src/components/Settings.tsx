import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PageHeader } from "@/components/ui/page-states";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";

const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];
const BODY_TYPE_OPTIONS = [
  { value: "slim", label: "Slim" },
  { value: "athletic", label: "Athletic" },
  { value: "average", label: "Average" },
  { value: "curvy", label: "Curvy" },
  { value: "plus-size", label: "Plus size" },
];
const SKIN_TONE_OPTIONS = [
  { value: "fair", label: "Fair" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "tan", label: "Tan" },
  { value: "deep", label: "Deep" },
];

// Profiles saved before these were dropdowns and number fields hold free text
const matchOption = (options: { value: string }[], saved: unknown) => {
  const text = String(saved ?? "").trim().toLowerCase();
  return options.some((option) => option.value === text) ? text : "";
};
const asPositiveNumber = (saved: unknown) => {
  const value = Number(saved);
  return value > 0 ? String(value) : "";
};

export default function Settings() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, logout } = useAppContext();
  const { showToast } = useToast();

  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [useProfile, setUseProfile] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    height: "",
    weight: "",
    gender: "",
    skintone: "",
    bodytype: "",
  });

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      const metadata = data.user?.user_metadata;
      if (!metadata) return;

      setAvatarUrl(metadata.avatar_url || "");
      setUseProfile(metadata.use_profile_for_suggestions !== false);
      setFormData({
        name: metadata.name || "",
        username: metadata.username || "",
        height: asPositiveNumber(metadata.height),
        weight: asPositiveNumber(metadata.weight),
        gender: matchOption(GENDER_OPTIONS, metadata.gender),
        skintone: matchOption(SKIN_TONE_OPTIONS, metadata.skintone),
        bodytype: matchOption(BODY_TYPE_OPTIONS, metadata.bodytype),
      });
    };
    getUser();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        ...formData,
        avatar_url: avatarUrl,
        use_profile_for_suggestions: useProfile,
      },
    });
    setSaving(false);

    if (error) showToast("Couldn't update your profile. Please try again.", { isError: true });
    else showToast("Profile updated.");
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const filePath = `${user.id}-${Date.now()}`;

    const { error } = await supabase.storage
      .from("profiles")
      .upload(filePath, file);

    if (error) {
      showToast("Couldn't upload that photo. Please try again.", { isError: true });
      return;
    }

    const { data } = supabase.storage
      .from("profiles")
      .getPublicUrl(filePath);

    setAvatarUrl(data.publicUrl);
    showToast("Photo ready. Save your profile to keep it.");
  };

  const selectField = (id: keyof typeof formData, label: string, options: { value: string; label: string }[]) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} name={id} value={formData[id]} onChange={handleChange}>
        <option value="">Prefer not to say</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </NativeSelect>
    </div>
  );

  const textField = (id: keyof typeof formData, label: string, extra: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} value={formData[id]} onChange={handleChange} {...extra} />
    </div>
  );

  return (
    <div className="max-w-xl pb-8">
      <PageHeader title="Settings" description="Your profile and how it shapes your suggestions." />

      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">
          <img
            src={avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`}
            alt="Your profile"
            className="w-16 h-16 rounded-full object-cover bg-muted"
          />
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            <Button type="button" size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} className="mt-2">
              Change photo
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 space-y-4">
          <h3 className="text-sm font-semibold">About you</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {textField("name", "Full name")}
            {textField("username", "Username")}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 space-y-4">
          <h3 className="text-sm font-semibold">Style profile</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {selectField("gender", "Gender", GENDER_OPTIONS)}
            {selectField("bodytype", "Body type", BODY_TYPE_OPTIONS)}
            {selectField("skintone", "Skin tone", SKIN_TONE_OPTIONS)}
            {textField("height", "Height (cm)", { type: "number", min: "1", step: "1" })}
            {textField("weight", "Weight (kg)", { type: "number", min: "1", step: "1" })}
          </div>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={useProfile}
              onChange={(e) => setUseProfile(e.target.checked)}
              className="mt-0.5 size-4 accent-indigo-500"
            />
            <span>
              Use my style profile for outfit suggestions
              <span className="block text-xs text-muted-foreground">Gender, body type, skin tone and height gently influence results. Weight isn't used.</span>
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button>
          <Button type="button" variant="ghost" onClick={logout}>Log out</Button>
        </div>
      </form>
    </div>
  );
}
