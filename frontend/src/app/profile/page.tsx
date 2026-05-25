"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { useRole } from "@/lib/role-context";
import { useEffect, useState } from "react";
import { 
  fetchUser, changePassword, updateProfile, UserData,
  AlertContact, AlertSettings, fetchAlertContacts, fetchAlertSettings, 
  addAlertContact, deleteAlertContact, updateAlertSettings
} from "@/lib/api-client";
import { NotificationSettings } from "@/components/NotificationSettings";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { role, userId } = useRole();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Doctor username state
  const [editingUsername, setEditingUsername] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSuccess, setUsernameSuccess] = useState("");
  const [updatingUsername, setUpdatingUsername] = useState(false);

  // Personal Info state
  const [editingPersonalInfo, setEditingPersonalInfo] = useState(false);
  const [personalName, setPersonalName] = useState("");
  const [personalAge, setPersonalAge] = useState<string>("");
  const [personalGender, setPersonalGender] = useState("");
  const [personalNextCheckup, setPersonalNextCheckup] = useState("");
  const [personalError, setPersonalError] = useState("");
  const [personalSuccess, setPersonalSuccess] = useState("");
  const [updatingPersonalInfo, setUpdatingPersonalInfo] = useState(false);
  // Alert Settings state
  const [alertSettings, setAlertSettings] = useState<AlertSettings | null>(null);
  const handleUpdateAlertSettings = async (patch: Partial<AlertSettings>) => {
    if (!userId) return;
    try {
      const updated = await updateAlertSettings(userId, patch);
      setAlertSettings(updated);
    } catch (err: any) {
      console.error("Failed to update alert settings:", err);
    }
  };

  const handleToggleAlerts = async (enabled: boolean) => {
    await handleUpdateAlertSettings({ enable_email_alerts: enabled });
  };
  const [alertContacts, setAlertContacts] = useState<AlertContact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactRelation, setNewContactRelation] = useState("caregiver");
  const [customRelation, setCustomRelation] = useState("");
  const [alertError, setAlertError] = useState("");
  const [alertSuccess, setAlertSuccess] = useState("");
  const [updatingAlerts, setUpdatingAlerts] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (userId) {
      Promise.all([
        fetchUser(userId),
        fetchAlertSettings(userId).catch(() => null),
        fetchAlertContacts(userId).catch(() => []),
      ])
        .then(([userData, settingsData, contactsData]) => {
          setUserData(userData);
          if (userData.username) setUsername(userData.username);
          if (userData.name) setPersonalName(userData.name);
          if (userData.age) setPersonalAge(userData.age.toString());
          if (userData.gender) setPersonalGender(userData.gender);
          if (userData.next_checkup) {
            setPersonalNextCheckup(new Date(userData.next_checkup).toISOString().split('T')[0]);
          }
          if (settingsData) setAlertSettings(settingsData as AlertSettings);
          if (contactsData) setAlertContacts(contactsData as AlertContact[]);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [userId]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError("New password must contain an uppercase letter");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setPasswordError("New password must contain a number");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (!userId) return;

    setChangingPassword(true);
    try {
      await changePassword(userId, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess("");
      }, 2000);
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleUsernameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError("");
    setUsernameSuccess("");

    if (!username || username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError("Username can only contain letters, numbers, and underscores");
      return;
    }

    if (!userId) return;

    setUpdatingUsername(true);
    try {
      const updatedUser = await updateProfile(userId, { username: username });
      setUserData(updatedUser);
      setUsernameSuccess("Username updated successfully!");
      // Sync username change across the app
      window.dispatchEvent(new CustomEvent("refresh-all"));
      setTimeout(() => {
        setEditingUsername(false);
        setUsernameSuccess("");
      }, 2000);
    } catch (err: any) {
      setUsernameError(err?.message || "Failed to update username. It might be taken.");
    } finally {
      setUpdatingUsername(false);
    }
  };

  const handlePersonalInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalError("");
    setPersonalSuccess("");

    if (!userId) return;
    
    let ageNum: number | undefined = undefined;
    if (personalAge) {
      ageNum = parseInt(personalAge, 10);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
        setPersonalError("Please enter a valid age.");
        return;
      }
    }

    setUpdatingPersonalInfo(true);
    try {
      const updatedUser = await updateProfile(userId, { 
        name: personalName || undefined,
        age: ageNum,
        gender: personalGender || undefined,
        next_checkup: personalNextCheckup || undefined
      });
      setUserData(updatedUser);
      setPersonalSuccess("Personal information updated!");
      // Sync name/age/gender across dashboard, patient list, and overview
      window.dispatchEvent(new CustomEvent("refresh-all"));
      setTimeout(() => {
        setEditingPersonalInfo(false);
        setPersonalSuccess("");
      }, 2000);
    } catch (err: any) {
      setPersonalError(err?.message || "Failed to update personal information.");
    } finally {
      setUpdatingPersonalInfo(false);
    }
  };

  const handleAddAlertContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertError("");
    setAlertSuccess("");

    if (alertContacts.length >= 2) {
      setAlertError("Maximum 2 alert contacts allowed.");
      return;
    }

    if (!userId) return;

    setUpdatingAlerts(true);
    try {
      const newContact = await addAlertContact(userId, {
        name: newContactName,
        email: newContactEmail,
        relation: newContactRelation === "other" ? customRelation : newContactRelation,
      });
      setAlertContacts([...alertContacts, newContact]);
      setAlertSuccess("Contact added successfully.");
      setNewContactName("");
      setNewContactEmail("");
      setCustomRelation("");
      setShowAddContact(false);
      setTimeout(() => setAlertSuccess(""), 3000);
    } catch (err: any) {
      setAlertError(err?.message || "Failed to add contact.");
    } finally {
      setUpdatingAlerts(false);
    }
  };

  const handleRemoveAlertContact = async (contactId: string) => {
    if (!userId) return;
    try {
      await deleteAlertContact(userId, contactId);
      setAlertContacts(alertContacts.filter((c) => c.id !== contactId));
    } catch (err: any) {
      console.error("Failed to remove contact:", err);
    }
  };

  if (status === "loading" || loading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto animate-pulse space-y-4">
          <div className="h-8 w-40 bg-[var(--bg-elevated)] rounded-lg" />
          <div className="h-72 bg-[var(--bg-elevated)] rounded-2xl" />
          <div className="h-48 bg-[var(--bg-elevated)] rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (!session) return null;

  const authProvider = userData?.auth_provider || (session.user as any)?.provider || "google";
  const hasPassword = userData?.has_password || false;
  const isGoogleOnly = authProvider === "google" && !hasPassword;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold theme-text">Account Profile</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-[11px] font-semibold text-red-400 transition-all hover:bg-red-500/10"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Sign Out
            </button>
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] theme-text-muted transition-all hover:bg-[var(--bg-elevated-hover)] hover:theme-text"
              title="Close and go back"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <GlassCard padding="lg" className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-sky-500/10 to-violet-500/10" />
          
          <button
            onClick={() => router.back()}
            className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-elevated)] theme-text-muted backdrop-blur-md border border-[var(--border-primary)] hover:bg-[var(--bg-elevated-hover)] hover:theme-text transition-all shadow-lg"
            title="Go back"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative pt-8 flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative mb-4">
              <div className="h-24 w-24 rounded-full border-4 border-[var(--bg-primary)] bg-slate-800 overflow-hidden shadow-xl">
                {session.user?.image ? (
                  <img src={session.user.image} alt={session.user.name || "User"} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-2xl font-bold theme-text bg-gradient-to-br from-sky-500/30 to-violet-500/30">
                    {session.user?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-[var(--bg-primary)]" />
            </div>

            <h2 className="text-xl font-bold theme-text">{session.user?.name || userData?.name}</h2>
            <p className="text-sm theme-text-muted">{session.user?.email}</p>

            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-input)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider theme-text-muted">
                {role || "No Role Assigned"}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                authProvider === "google"
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  : "bg-violet-500/10 text-violet-400 border-violet-500/20"
              }`}>
                {authProvider === "google" ? "Google" : "Email"}
              </span>
            </div>
          </div>

          {/* Info cards */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)]">
              <p className="text-[10px] theme-text-dimmed uppercase font-bold mb-1">Auth Provider</p>
              <div className="flex items-center gap-2">
                {authProvider === "google" ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                ) : (
                  <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                )}
                <span className="text-sm theme-text font-medium">
                  {authProvider === "google" ? "Google Authentication" : "Email & Password"}
                </span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)]">
              <p className="text-[10px] theme-text-dimmed uppercase font-bold mb-1">Account Status</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-sm theme-text font-medium">Verified & Active</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Account Settings */}
        <GlassCard padding="md">
          <h3 className="text-sm font-bold theme-text mb-4">Account Settings</h3>
          <div className="space-y-0">
            <div className="flex items-center justify-between py-3 border-b border-[var(--border-primary)]">
              <div>
                <p className="text-sm font-medium theme-text">Email Address</p>
                <p className="text-xs theme-text-dimmed">Primary contact email</p>
              </div>
              <span className="text-sm theme-text-muted font-mono truncate max-w-[200px]">{session.user?.email}</span>
            </div>
            {/* Personal Details (Name/Age/Gender) */}
            <div className="flex flex-col py-3 border-b border-[var(--border-primary)]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium theme-text">Personal Details</p>
                  <p className="text-xs theme-text-dimmed">Name, age, and gender for health analysis</p>
                </div>
                {!editingPersonalInfo ? (
                  <button 
                    onClick={() => { setEditingPersonalInfo(true); setPersonalError(""); setPersonalSuccess(""); }}
                    className="rounded-xl border border-[var(--border-input)] bg-[var(--bg-elevated)] px-3 py-1 text-xs text-sky-400 hover:bg-[var(--bg-elevated-hover)] transition-all"
                  >
                    Edit
                  </button>
                ) : (
                  <button 
                    onClick={() => setEditingPersonalInfo(false)}
                    className="rounded-xl border border-[var(--border-input)] bg-[var(--bg-elevated)] px-3 py-1 text-xs theme-text-muted hover:bg-[var(--bg-elevated-hover)] transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {!editingPersonalInfo ? (
                <div className="flex flex-col gap-2 mt-1">
                  <p className="text-sm theme-text font-medium">{userData?.name || "No name set"}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] theme-text-dimmed uppercase tracking-wider">Age:</span>
                      <span className="text-sm theme-text">{userData?.age ? `${userData.age}y` : "Not set"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] theme-text-dimmed uppercase tracking-wider">Gender:</span>
                      <span className="text-sm theme-text capitalize">{userData?.gender || "Not set"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] theme-text-dimmed uppercase tracking-wider">Next Checkup:</span>
                      <span className="text-sm theme-text">{userData?.next_checkup ? new Date(userData.next_checkup).toLocaleDateString() : "Not set"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePersonalInfoUpdate} className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                  {personalError && (
                    <div className="rounded-lg bg-red-500/[0.06] border border-red-500/20 px-3 py-2 text-[11px] text-red-400">
                      {personalError}
                    </div>
                  )}
                  {personalSuccess && (
                    <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 px-3 py-2 text-[11px] text-emerald-400">
                      ✓ {personalSuccess}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-[10px] theme-text-dimmed uppercase mb-1 ml-1">Full Name</label>
                    <input
                      type="text"
                      value={personalName}
                      onChange={(e) => setPersonalName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-4 py-2 text-sm theme-text outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] theme-text-dimmed uppercase mb-1 ml-1">Age</label>
                      <input
                        type="number"
                        value={personalAge}
                        onChange={(e) => setPersonalAge(e.target.value)}
                        placeholder="e.g. 54"
                        className="w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-4 py-2 text-sm theme-text outline-none focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] theme-text-dimmed uppercase mb-1 ml-1">Gender</label>
                      <select
                        value={personalGender}
                        onChange={(e) => setPersonalGender(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-4 py-2 text-sm theme-text outline-none focus:ring-2 focus:ring-sky-500/30"
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] theme-text-dimmed uppercase mb-1 ml-1">Next Checkup Date</label>
                    <input
                      type="date"
                      value={personalNextCheckup}
                      onChange={(e) => setPersonalNextCheckup(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-4 py-2 text-sm theme-text outline-none focus:ring-2 focus:ring-sky-500/30 [color-scheme:dark]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updatingPersonalInfo}
                    className="w-full py-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-bold hover:bg-sky-500/20 transition-all disabled:opacity-50"
                  >
                    {updatingPersonalInfo ? "Saving..." : "Save Details"}
                  </button>
                </form>
              )}
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium theme-text">Application Role</p>
                <p className="text-xs theme-text-dimmed">Determines dashboard permissions</p>
              </div>
              <span className="text-sm text-sky-400 font-bold capitalize">{role}</span>
            </div>
            
              <div className="flex flex-col py-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium theme-text">Username</p>
                    <p className="text-xs theme-text-dimmed">Other users use this to connect with you</p>
                  </div>
                  {!editingUsername ? (
                    <button 
                      onClick={() => { setEditingUsername(true); setUsernameError(""); setUsernameSuccess(""); }}
                      className="rounded-xl border border-[var(--border-input)] bg-[var(--bg-elevated)] px-3 py-1 text-xs text-sky-400 hover:bg-[var(--bg-elevated-hover)] transition-all"
                    >
                      {userData?.username ? "Edit" : "Set Username"}
                    </button>
                  ) : (
                    <button 
                      onClick={() => setEditingUsername(false)}
                      className="rounded-xl border border-[var(--border-input)] bg-[var(--bg-elevated)] px-3 py-1 text-xs theme-text-muted hover:bg-[var(--bg-elevated-hover)] transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {!editingUsername && (
                  <div className="mt-1">
                    {userData?.username ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/[0.08] px-3 py-1 text-xs font-mono font-medium text-sky-500 dark:text-sky-300 border border-sky-500/20">
                        @{userData.username}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400/80 italic">Not set — other users cannot connect with you</span>
                    )}
                  </div>
                )}

                {editingUsername && (
                  <form onSubmit={handleUsernameUpdate} className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                    {usernameError && (
                      <div className="rounded-lg bg-red-500/[0.06] border border-red-500/20 px-3 py-2 text-[11px] text-red-400">
                        {usernameError}
                      </div>
                    )}
                    {usernameSuccess && (
                      <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 px-3 py-2 text-[11px] text-emerald-400">
                        ✓ {usernameSuccess}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-dimmed font-mono text-sm">@</span>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="unique_username"
                          className="w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] pl-8 pr-4 py-2.5 text-sm font-mono theme-text placeholder:theme-text-faint outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/40"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={updatingUsername}
                        className="rounded-xl bg-sky-500/10 px-4 text-sm font-semibold text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 hover:border-sky-500/30 transition-all disabled:opacity-50"
                      >
                        {updatingUsername ? "..." : "Save"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
          </div>
        </GlassCard>

        {/* Emergency Health Alerts */}
        <GlassCard padding="md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2 theme-text">
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-red-500 font-bold">Emergency Health Alerts</span>
              </h2>
              <p className="text-[13px] mt-1 theme-text-secondary">
                Notify trusted contacts when your health risk is High
              </p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={alertSettings?.enable_email_alerts || false}
                onChange={(e) => handleToggleAlerts(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500 dark:bg-[var(--bg-elevated)] dark:border-gray-600"></div>
            </label>
          </div>

          <div className="space-y-4">
            <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-3">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-semibold theme-text">Alert Contacts</p>
                <span className="text-[10px] theme-text-dimmed bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full border border-[var(--border-primary)]">
                  {alertContacts.length} / 2 Added
                </span>
              </div>
              
              <div className="space-y-2">
                {alertContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-primary)] p-2 rounded-lg">
                    <div>
                      <p className="text-xs font-medium theme-text">{contact.name}</p>
                      <p className="text-[10px] theme-text-muted">{contact.email} • <span className="capitalize">{contact.relation}</span></p>
                    </div>
                    <button 
                      onClick={() => handleRemoveAlertContact(contact.id)}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                ))}

                {alertContacts.length === 0 && (
                  <p className="text-[11px] theme-text-faint italic py-2 text-center">No alert contacts added yet.</p>
                )}
              </div>

              {alertContacts.length < 2 && !showAddContact && (
                <button 
                  onClick={() => { setShowAddContact(true); setAlertError(""); setAlertSuccess(""); }}
                  className="mt-3 w-full py-2 text-[11px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
                >
                  + Add Alert Contact
                </button>
              )}

              {showAddContact && (
                <form onSubmit={handleAddAlertContact} className="mt-3 p-3 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg space-y-3 animate-in fade-in slide-in-from-top-1">
                  {alertError && <p className="text-[10px] text-red-400">{alertError}</p>}
                  {alertSuccess && <p className="text-[10px] text-emerald-400">{alertSuccess}</p>}
                  
                  <div>
                    <label className="text-[10px] theme-text-dimmed uppercase tracking-wide">Name</label>
                    <input 
                      required 
                      type="text" 
                      value={newContactName} 
                      onChange={e => setNewContactName(e.target.value)}
                      className="w-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-input)] rounded-md px-2 py-1.5 text-xs theme-text outline-none focus:border-red-500/50"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] theme-text-dimmed uppercase tracking-wide">Email</label>
                    <input 
                      required 
                      type="email" 
                      value={newContactEmail} 
                      onChange={e => setNewContactEmail(e.target.value)}
                      className="w-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-input)] rounded-md px-2 py-1.5 text-xs theme-text outline-none focus:border-red-500/50"
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] theme-text-dimmed uppercase tracking-wide">Relation</label>
                    <select 
                      value={newContactRelation} 
                      onChange={e => setNewContactRelation(e.target.value)}
                      className="w-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-input)] rounded-md px-2 py-1.5 text-xs theme-text outline-none focus:border-red-500/50"
                    >
                      <option value="caregiver">Caregiver</option>
                      <option value="doctor">Doctor</option>
                      <option value="parent">Parent</option>
                      <option value="spouse">Spouse</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {newContactRelation === "other" && (
                    <div className="animate-in fade-in slide-in-from-top-1">
                      <label className="text-[10px] theme-text-dimmed uppercase tracking-wide">Specify Relation</label>
                      <input 
                        required 
                        type="text" 
                        value={customRelation} 
                        onChange={e => setCustomRelation(e.target.value)}
                        className="w-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-input)] rounded-md px-2 py-1.5 text-xs theme-text outline-none focus:border-red-500/50"
                        placeholder="e.g. Neighbor, Brother"
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={updatingAlerts} className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 py-1.5 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50">
                      Save Contact
                    </button>
                    <button type="button" onClick={() => setShowAddContact(false)} className="flex-1 bg-[var(--bg-elevated)] theme-text-muted border border-[var(--border-input)] hover:bg-[var(--bg-elevated-hover)] py-1.5 rounded-md text-[11px] font-semibold transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Device Push Notifications */}
        {userId && <NotificationSettings userId={userId} />}

        {/* Password Management */}
        <GlassCard padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold theme-text">Password</h3>
              <p className="text-xs theme-text-dimmed mt-0.5">
                {isGoogleOnly
                  ? "You signed in with Google — no password is set"
                  : hasPassword
                  ? "Last changed: recently"
                  : "Set a password for email login"}
              </p>
            </div>
            {!isGoogleOnly && (
              <button
                onClick={() => { setShowPasswordForm(!showPasswordForm); setPasswordError(""); setPasswordSuccess(""); }}
                className="rounded-xl border border-[var(--border-input)] bg-[var(--bg-elevated)] px-3 py-2 text-xs theme-text-muted hover:bg-[var(--bg-elevated-hover)] hover:theme-text transition-all"
              >
                {showPasswordForm ? "Cancel" : "Change Password"}
              </button>
            )}
          </div>

          {isGoogleOnly && (
            <div className="rounded-xl bg-sky-500/[0.04] border border-sky-500/20 px-4 py-3 flex items-start gap-3">
              <svg className="h-4 w-4 text-sky-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p className="text-xs text-sky-500 dark:text-sky-300 leading-relaxed">
                Your account is secured through Google. Password management is handled by your Google account settings.
              </p>
            </div>
          )}

          {/* Password Change Form */}
          {showPasswordForm && !isGoogleOnly && (
            <form onSubmit={handlePasswordChange} className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
              {passwordError && (
                <div className="rounded-xl bg-red-500/[0.06] border border-red-500/20 px-4 py-3 text-xs text-red-400">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 px-4 py-3 text-xs text-emerald-400">
                  ✓ {passwordSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium theme-text-muted mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-4 py-3 text-sm theme-text placeholder:theme-text-faint outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/40"
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium theme-text-muted mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-4 py-3 text-sm theme-text placeholder:theme-text-faint outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/40"
                  placeholder="Min 8 characters, 1 uppercase, 1 number"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium theme-text-muted mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-4 py-3 text-sm theme-text placeholder:theme-text-faint outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/40"
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 py-3 text-sm font-semibold theme-text shadow-lg shadow-sky-500/20 transition-all hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {changingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
        </GlassCard>

        <p className="text-center text-[10px] theme-text-faint">
          CKD Guardian Account ID: {userId}
        </p>
      </div>
    </AppShell>
  );
}
