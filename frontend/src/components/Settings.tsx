import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

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
      if (data.user) {
        setUser(data.user);
        setAvatarUrl(data.user.user_metadata?.avatar_url || "");

        setFormData({
          name: data.user.user_metadata?.name || "",
          username: data.user.user_metadata?.username || "",
          height: data.user.user_metadata?.height || "",
          weight: data.user.user_metadata?.weight || "",
          gender: data.user.user_metadata?.gender || "",
          skintone: data.user.user_metadata?.skintone || "",
          bodytype: data.user.user_metadata?.bodytype || "",
        });
      }
    };
    getUser();
  }, []);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const { error } = await supabase.auth.updateUser({
      data: {
        ...formData,
        avatar_url: avatarUrl,
      },
    });

    if (error) alert("Error updating profile");
    else alert("Profile Updated Successfully");
  };

  const handleImageUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const filePath = `${user.id}-${Date.now()}`;

    const { error } = await supabase.storage
      .from("profiles")
      .upload(filePath, file);

    if (error) {
      alert("Upload failed");
      return;
    }

    const { data } = supabase.storage
      .from("profiles")
      .getPublicUrl(filePath);

    setAvatarUrl(data.publicUrl);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="max-w-xl space-y-6">

      <h2 className="text-xl font-semibold">Profile Settings</h2>

      {/* PROFILE PHOTO */}
      <div className="flex flex-col items-center space-y-3">
        <img
          src={
            avatarUrl ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`
          }
          className="w-24 h-24 rounded-full object-cover"
        />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          hidden
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Change Photo
        </button>
      </div>

      {/* EMAIL */}
      <div>
        <label>Email</label>
        <input
          value={user?.email || ""}
          readOnly
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      {/* OTHER FIELDS */}
      {Object.keys(formData).map((key) => (
        <div key={key}>
          <label className="capitalize">{key}</label>
          <input
            name={key}
            value={(formData as any)[key]}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
      ))}

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Save Profile
      </button>

      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        Logout
      </button>

    </div>
  );
}