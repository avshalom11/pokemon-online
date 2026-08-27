"use client";

import { useState } from "react";

import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { ChangeUsernameDialog } from "./ChangeUsernameDialog";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { USERNAME_CHANGE_COST_GOLD } from "@/features/profile/config/security-account.config";

interface SecurityAccountSectionProps {
  currentUsername: string;
  // PRIVACY — the account owner's own registered email. Only ever passed by
  // ProfileContent when view.isOwner is true (see that component's own doc
  // comment) — this component itself only ever renders for the owner, so
  // there is no code path where another viewer's render tree holds this
  // value at all.
  ownerEmail: string;
  onUsernameChanged: (newUsername: string) => void;
}

// "אבטחה וחשבון" — the owner-only account/security actions, deliberately
// its OWN card, visually separate from the normal profile-content editing
// in EditProfileModal (about me/avatar/theme/privacy/showcase) per this
// feature's own spec. Account deletion ("מחק משתמש") lives here as a third
// row alongside username/password changes — deliberately NOT a separate
// "danger zone" section/title, per this feature's own UI spec — styled as
// a destructive red row to stand apart from the two ordinary rows above it.
export function SecurityAccountSection({ currentUsername, ownerEmail, onUsernameChanged }: SecurityAccountSectionProps) {
  const [isChangeUsernameOpen, setIsChangeUsernameOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

  return (
    <div dir="rtl" className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6">
      <h2 className="text-sm font-bold tracking-wide text-slate-100">אבטחה וחשבון</h2>
      <p className="mt-1 text-xs text-slate-400">
        אימייל: <span dir="auto">{ownerEmail}</span>
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <SecurityActionRow
          label="שינוי שם משתמש"
          costLabel={`${USERNAME_CHANGE_COST_GOLD} זהב`}
          onClick={() => setIsChangeUsernameOpen(true)}
        />
        <SecurityActionRow label="שינוי סיסמה" costLabel="חינם" onClick={() => setIsChangePasswordOpen(true)} />
        <button
          type="button"
          onClick={() => setIsDeleteAccountOpen(true)}
          className="flex items-center justify-between rounded-lg border border-rose-500/40 bg-rose-600 px-4 py-3 text-start transition-colors hover:bg-rose-500"
        >
          <span className="text-sm font-semibold text-white">מחק משתמש</span>
        </button>
      </div>

      {isChangeUsernameOpen ? (
        <ChangeUsernameDialog
          currentUsername={currentUsername}
          onClose={() => setIsChangeUsernameOpen(false)}
          onSuccess={(newUsername) => {
            setIsChangeUsernameOpen(false);
            onUsernameChanged(newUsername);
          }}
        />
      ) : null}

      {isChangePasswordOpen ? <ChangePasswordDialog onClose={() => setIsChangePasswordOpen(false)} /> : null}

      {isDeleteAccountOpen ? <DeleteAccountDialog onClose={() => setIsDeleteAccountOpen(false)} /> : null}
    </div>
  );
}

function SecurityActionRow({ label, costLabel, onClick }: { label: string; costLabel: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-800/60 px-4 py-3 text-start transition-colors hover:border-white/20 hover:bg-slate-800"
    >
      <span className="text-sm font-semibold text-slate-100">{label}</span>
      <span className={`text-xs font-semibold ${costLabel === "חינם" ? "text-emerald-400" : "text-amber-400"}`}>
        {costLabel}
      </span>
    </button>
  );
}
