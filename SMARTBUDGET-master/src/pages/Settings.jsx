import { useEffect, useState } from "react";
import Header from "../components/Header";
import { authAPI, settingsAPI, transactionAPI } from "../utils/api";

export default function Settings() {
  const [profile, setProfile] = useState({ username: "", email: "" });
  const [settings, setSettings] = useState({ monthlyBudget: 0, notifications: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [status, setStatus] = useState(null);
  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' });

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        // Load settings; profile from localStorage
        const raw = localStorage.getItem("sb_user");
        const user = raw ? JSON.parse(raw) : null;
        if (user) setProfile({ username: user.username || "", email: user.email || "" });
        const data = await settingsAPI.get();
        setSettings({
          monthlyBudget: data?.settings?.monthlyBudget ?? 0,
          notifications: data?.settings?.notifications ?? true,
        });
      } catch (e) {
        setStatus({ type: "error", message: e.message });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await authAPI.updateProfile(profile);
      // update local storage user
      const raw = localStorage.getItem("sb_user");
      const prev = raw ? JSON.parse(raw) : {};
      const updated = { ...prev, ...res.user };
      localStorage.setItem("sb_user", JSON.stringify(updated));
      setStatus({ type: "success", message: res.message || "Profile updated" });
    } catch (e) {
      setStatus({ type: "error", message: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await settingsAPI.update(settings);
      setStatus({ type: "success", message: res.message || "Settings saved" });
    } catch (e) {
      setStatus({ type: "error", message: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function clearAllTransactions() {
    if (!confirm("Are you sure you want to delete all transactions?")) return;
    setClearing(true);
    setStatus(null);
    try {
      const res = await transactionAPI.deleteAll();
      setStatus({ type: "success", message: res.message || "Transactions cleared" });
    } catch (e) {
      setStatus({ type: "error", message: e.message });
    } finally {
      setClearing(false);
    }
  }

  return (
    <>
      <Header />
      <section className="settings-page">
        <h2>Settings</h2>
        {status && (
          <p className={status.type === "error" ? "error" : "success"}>{status.message}</p>
        )}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <form onSubmit={saveProfile} className="settings" style={{ borderTop: "4px solid #facc15" }}>
              <h3>Profile</h3>
              <label>Username</label>
              <input type="text" value={profile.username} onChange={e=>setProfile(p=>({...p, username: e.target.value}))} required />
              <label>Email</label>
              <input type="email" value={profile.email} onChange={e=>setProfile(p=>({...p, email: e.target.value}))} required />
              <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
            </form>

            <form onSubmit={saveSettings} className="settings" style={{ borderTop: "4px solid #facc15" }}>
              <h3>Budget & Preferences</h3>
              <label>Monthly Budget (₹)</label>
              <input type="number" min="0" step="0.01" value={settings.monthlyBudget}
                     onChange={e=>setSettings(s=>({...s, monthlyBudget: parseFloat(e.target.value || 0)}))} />
              <label>Notifications
                <input type="checkbox" checked={!!settings.notifications}
                       onChange={e=>setSettings(s=>({...s, notifications: e.target.checked}))} />
              </label>
              <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Settings"}</button>
              <button type="button" onClick={clearAllTransactions} disabled={clearing} style={{ marginLeft: 8, backgroundColor: "#f59e0b" }}>
                {clearing ? "Clearing..." : "Clear All Transactions"}
              </button>
            </form>
            
            <form onSubmit={async (e)=>{
              e.preventDefault();
              if (!pwd.oldPassword || !pwd.newPassword) { setStatus({ type: 'error', message: 'Fill all password fields' }); return; }
              if (pwd.newPassword.length < 6) { setStatus({ type: 'error', message: 'New password is too short' }); return; }
              if (pwd.newPassword !== pwd.confirm) { setStatus({ type: 'error', message: 'Passwords do not match' }); return; }
              setSaving(true);
              setStatus(null);
              try {
                const res = await authAPI.changePassword({ oldPassword: pwd.oldPassword, newPassword: pwd.newPassword });
                setStatus({ type: 'success', message: res.message || 'Password changed' });
                setPwd({ oldPassword: '', newPassword: '', confirm: '' });
              } catch (e) {
                setStatus({ type: 'error', message: e.message });
              } finally {
                setSaving(false);
              }
            }} className="settings" style={{ borderTop: "4px solid #facc15" }}>
              <h3>Change Password</h3>
              <label>Old Password</label>
              <input type="password" value={pwd.oldPassword} onChange={e=>setPwd(p=>({...p, oldPassword: e.target.value}))} />
              <label>New Password</label>
              <input type="password" value={pwd.newPassword} onChange={e=>setPwd(p=>({...p, newPassword: e.target.value}))} />
              <label>Confirm New Password</label>
              <input type="password" value={pwd.confirm} onChange={e=>setPwd(p=>({...p, confirm: e.target.value}))} />
              <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Change Password'}</button>
            </form>
          </div>
        )}
      </section>
    </>
  );
}
