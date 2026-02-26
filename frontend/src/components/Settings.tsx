export default function Settings() {
  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-xl font-semibold">User Settings</h2>

      <div>
        <label className="block text-sm">Username</label>
        <input className="w-full border px-3 py-2 rounded" value="User" readOnly />
      </div>

      <div>
        <label className="block text-sm">Email</label>
        <input className="w-full border px-3 py-2 rounded" value="user@email.com" readOnly />
      </div>
    </div>
  );
}