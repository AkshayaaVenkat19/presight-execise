import { memo } from "react";
import type { User } from "../../types/directory";
import { Avatar } from "../ui/Avatar";
import { HobbyTags } from "./HobbyTags";

export const UserCard = memo(function UserCard({ user }: { user: User }) {
  return (
    <article className="h-[180px] overflow-hidden rounded-xl border border-border bg-surface px-4 py-5 shadow-panel hover:border-accent compact:p-[22px]">
      <div className="flex items-center gap-3.5">
        <Avatar user={user} />
        <div className="min-w-0 flex-1">
          <h2
            className="truncate text-[15px] font-semibold tracking-[-.2px]"
            title={`${user.first_name} ${user.last_name}`}
          >
            {user.first_name} {user.last_name}
          </h2>
          <p className="mt-1.5 flex items-center justify-between gap-2.5 text-[11px] text-muted">
            <span className="truncate" title={user.nationality}>
              {user.nationality}
            </span>
            <span className="whitespace-nowrap text-[10px]">
              {user.age} yrs
            </span>
          </p>
        </div>
      </div>
      <div className="mt-[18px] compact:ml-[66px]">
        <span className="text-[10px] font-semibold tracking-[1.2px] text-muted uppercase">
          Interests
        </span>
        <HobbyTags hobbies={user.hobbies} />
      </div>
    </article>
  );
});
