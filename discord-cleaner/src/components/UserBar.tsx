"use client";

import type { DiscordUser } from "@/lib/types";
import { userAvatarUrl } from "@/lib/avatars";

interface UserBarProps {
  user: DiscordUser;
  onLogout: () => void;
}

export function UserBar({ user, onLogout }: UserBarProps) {
  const displayName = user.global_name ?? user.username;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#2b2d31] px-4 py-3">
      <div className="flex items-center gap-3">
        <img
          src={userAvatarUrl(user)}
          alt=""
          className="h-10 w-10 rounded-full"
        />
        <div>
          <p className="font-medium text-white">{displayName}</p>
          <p className="text-sm text-[#b5bac1]">@{user.username}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-lg px-3 py-2 text-sm text-[#b5bac1] transition hover:bg-white/5 hover:text-white"
      >
        Log out
      </button>
    </div>
  );
}
