"use client";

import { useState, useTransition, type ReactNode } from "react";

import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { ProfileContentEditor } from "./ProfileContentEditor";
import { SpriteImage } from "@/components/media/SpriteImage";
import { updateProfileAction } from "@/features/profile/actions/update-profile.action";
import { PROFILE_AVATAR_OPTIONS } from "@/features/profile/themes/profile-avatars";
import { PROFILE_THEMES, PROFILE_THEME_IDS, type ProfileThemeId } from "@/features/profile/themes/profile-themes";
import { ABOUT_ME_MAX_LENGTH } from "@/features/profile/validation/profile.schema";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import type { ProfileContentBlock } from "../types/profile-content.types";
import type { ProfileEditViewModel } from "../types/profile.types";

interface EditProfileModalProps {
  data: ProfileEditViewModel;
  onClose: () => void;
  onSaved: (username: string) => void;
}

// The owner's edit form — every field the spec lists (username, about me,
// avatar, theme, and the three visibility toggles), plus a live preview of
// the REAL current party (data.partyPreview — always the real party,
// regardless of the showPartyOnProfile toggle below it, per this feature's
// own "owner may still preview their own party while editing" rule) and a
// separate entry point to change password (its own dialog — password
// changes are never bundled into this same save action).
export function EditProfileModal({ data, onClose, onSaved }: EditProfileModalProps) {
  const [username, setUsername] = useState(data.username);
  const [aboutMe, setAboutMe] = useState(data.aboutMe);
  const [avatarDexNumber, setAvatarDexNumber] = useState<number | null>(data.avatarDexNumber);
  const [themeId, setThemeId] = useState<ProfileThemeId>(data.themeId);
  const [showPartyOnProfile, setShowPartyOnProfile] = useState(data.showPartyOnProfile);
  const [showStatsOnProfile, setShowStatsOnProfile] = useState(data.showStatsOnProfile);
  const [showAboutMeOnProfile, setShowAboutMeOnProfile] = useState(data.showAboutMeOnProfile);
  const [showGymAchievementsOnProfile, setShowGymAchievementsOnProfile] = useState(data.showGymAchievementsOnProfile);
  const [contentBlocks, setContentBlocks] = useState<ProfileContentBlock[]>(data.contentBlocks ?? []);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updateProfileAction({
        username,
        aboutMe,
        avatarDexNumber,
        themeId,
        showPartyOnProfile,
        showStatsOnProfile,
        showAboutMeOnProfile,
        showGymAchievementsOnProfile,
        contentBlocks,
      });

      if (result.status === "success") {
        onSaved(result.username);
        return;
      }

      setErrorMessage(result.message);
    });
  }

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-[0_0_40px_rgba(99,102,241,0.25)] sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-lg font-bold text-slate-100">ערוך פרופיל</h2>

        <div className="mt-5 flex flex-col gap-5">
          <Field label="שם משתמש">
            <input
              type="text"
              dir="ltr"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400/50 focus:outline-none"
            />
          </Field>

          <Field label={`אודות (${aboutMe.length}/${ABOUT_ME_MAX_LENGTH})`}>
            <textarea
              value={aboutMe}
              maxLength={ABOUT_ME_MAX_LENGTH}
              onChange={(event) => setAboutMe(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400/50 focus:outline-none"
            />
          </Field>

          <Field label="אווטאר">
            <div className="flex flex-wrap gap-2">
              <AvatarOption
                selected={avatarDexNumber === null}
                label="ברירת מחדל"
                onClick={() => setAvatarDexNumber(null)}
              />
              {PROFILE_AVATAR_OPTIONS.map((option) => (
                <AvatarOption
                  key={option.dexNumber}
                  selected={avatarDexNumber === option.dexNumber}
                  label={option.label}
                  imageUrl={option.imageUrl}
                  onClick={() => setAvatarDexNumber(option.dexNumber)}
                />
              ))}
            </div>
          </Field>

          <Field label="ערכת עיצוב">
            <div className="flex flex-wrap gap-2">
              {PROFILE_THEME_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setThemeId(id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    themeId === id
                      ? "border-indigo-400/70 bg-indigo-500/20 text-indigo-200"
                      : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-indigo-400/40"
                  }`}
                >
                  {PROFILE_THEMES[id].label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="פרטיות">
            <div className="flex flex-col gap-2">
              <ToggleRow label="הצג שישייה בפרופיל" checked={showPartyOnProfile} onChange={setShowPartyOnProfile} />
              <ToggleRow label="הצג סטטיסטיקות בפרופיל" checked={showStatsOnProfile} onChange={setShowStatsOnProfile} />
              <ToggleRow label="הצג אודות בפרופיל" checked={showAboutMeOnProfile} onChange={setShowAboutMeOnProfile} />
              <ToggleRow
                label="הצג תגים ומדליות בפרופיל"
                checked={showGymAchievementsOnProfile}
                onChange={setShowGymAchievementsOnProfile}
                helperText="כאשר האפשרות פעילה, משתמשים אחרים יוכלו לראות את תגי המכונים ומדליות המחוז שהשגת."
              />
            </div>
          </Field>

          {data.partyPreview.length > 0 ? (
            <Field label="תצוגה מקדימה של השישייה שלך (תמיד גלויה לך כאן, גם אם מוסתרת מאחרים)">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {data.partyPreview.map((member, index) => (
                  <div
                    key={`${member.dexNumber}-${index}`}
                    className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-slate-950/40 p-1.5 text-center"
                  >
                    <SpriteImage
                      src={getFrontSpritePath(member)}
                      alt={member.displayName}
                      className="h-10 w-10 object-contain"
                      fallbackClassName="flex h-10 w-10 items-center justify-center rounded border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
                    />
                    <span className="truncate text-[10px] font-semibold text-slate-100">{member.displayName}</span>
                  </div>
                ))}
              </div>
            </Field>
          ) : null}

          <Field label="תוכן הפרופיל הציבורי">
            <ProfileContentEditor blocks={contentBlocks} onChange={setContentBlocks} />
          </Field>

          <button
            type="button"
            onClick={() => setIsChangePasswordOpen(true)}
            className="self-start rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-white/20 hover:bg-slate-800"
          >
            שינוי סיסמה
          </button>
        </div>

        {errorMessage ? <p className="mt-4 text-center text-xs font-semibold text-rose-400">{errorMessage}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>

      {isChangePasswordOpen ? <ChangePasswordDialog onClose={() => setIsChangePasswordOpen(false)} /> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  helperText,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  // PROFILE ACHIEVEMENTS (later task) — optional, so every existing
  // ToggleRow call site keeps rendering exactly as before; only the new
  // achievements toggle passes one.
  helperText?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-950/40 px-3 py-2">
      <label className="flex cursor-pointer items-center justify-between text-sm text-slate-200">
        {label}
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" />
      </label>
      {helperText ? <p className="mt-1 text-[11px] text-slate-500">{helperText}</p> : null}
    </div>
  );
}

function AvatarOption({
  selected,
  label,
  imageUrl,
  onClick,
}: {
  selected: boolean;
  label: string;
  imageUrl?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`flex h-14 w-14 items-center justify-center rounded-lg border p-1 transition-colors ${
        selected ? "border-indigo-400/70 bg-indigo-500/20" : "border-white/10 bg-slate-950/40 hover:border-white/30"
      }`}
    >
      {imageUrl ? (
        <SpriteImage
          src={imageUrl}
          alt={label}
          className="h-full w-full object-contain"
          fallbackClassName="flex h-full w-full items-center justify-center text-slate-500"
        />
      ) : (
        <span className="text-lg font-bold text-slate-400">?</span>
      )}
    </button>
  );
}
