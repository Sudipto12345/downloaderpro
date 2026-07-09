import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Calendar, CheckCircle } from "lucide-react";

export default function ProfileCard() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  if (!user) return null;

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    try {
      await updateProfile(name.trim());
      setSuccess("Profile updated successfully!");
      setIsEditing(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    }
  };

  return (
    <Card className="max-w-xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
      <div className="flex items-center gap-4 border-b border-border/40 pb-6">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20 text-white font-bold text-xl uppercase">
          {user.name.slice(0, 2)}
        </div>
        <div>
          <h3 className="text-xl font-extrabold">{user.name}</h3>
          <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/25 capitalize mt-1">
            {user.role} Account
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Display Name
            </label>
            <div className="mt-2 flex gap-3">
              <div className="relative flex-1">
                <User className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  disabled={!isEditing}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-xl border border-input bg-secondary/35 pl-11 pr-4 text-sm focus:border-primary disabled:opacity-60"
                />
              </div>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="h-10 rounded-xl px-4">
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setName(user.name);
                      setIsEditing(false);
                    }}
                    className="h-10 rounded-xl px-4"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)} className="h-10 rounded-xl px-4">
                  Edit
                </Button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address
            </label>
            <div className="relative mt-2">
              <Mail className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                disabled
                value={user.email}
                className="h-10 rounded-xl border border-input bg-secondary/20 pl-11 pr-4 text-sm opacity-60"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Email address cannot be changed.</p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground border-t border-border/40 pt-4 mt-6">
            <Calendar className="h-4 w-4" />
            <span>Member since {new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: "long" })}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
