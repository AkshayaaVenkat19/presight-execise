import { useState } from "react";
import type { User } from "../../types/directory";

export function Avatar({
  user,
  size = "md",
}: {
  user: User;
  size?: "sm" | "md";
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-support-soft font-semibold text-support ${size === "sm" ? "size-[38px] text-xs" : "size-[52px] text-base"}`}
      aria-hidden="true"
    >
      {!failed && user.avatar ? (
        <img
          className="size-full object-cover"
          src={user.avatar}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>
          {user.first_name.charAt(0)}
          {user.last_name.charAt(0)}
        </span>
      )}
    </span>
  );
}
