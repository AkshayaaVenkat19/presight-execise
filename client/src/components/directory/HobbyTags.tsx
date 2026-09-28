export function HobbyTags({
  hobbies,
  compact = false,
}: {
  hobbies: string[];
  compact?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-[5px] overflow-hidden ${compact ? "" : "mt-[7px]"}`}
    >
      {hobbies.length === 0 ? (
        <span className="text-[11px] text-muted">--</span>
      ) : (
        hobbies.slice(0, 2).map((hobby) => (
          <span
            className="inline-block min-w-0 max-w-[140px] shrink truncate rounded-md border border-support/20 bg-support-soft px-2 py-[5px] text-[10px] text-support"
            key={hobby}
            title={hobby}
          >
            {hobby}
          </span>
        ))
      )}
      {hobbies.length > 2 && (
        <Popover
          portal
          className="shrink-0"
          panelClassName="bg-support-soft!"
          triggerClassName="rounded-md border border-transparent bg-accent-soft px-2 py-[5px] text-[10px] text-accent hover:border-accent"
          label={`${hobbies.length - 2} more hobbies`}
          trigger={`+${hobbies.length - 2}`}
        >
          <ul className="flex flex-wrap gap-1.5 p-2 whitespace-normal">
            {hobbies.slice(2).map((hobby) => (
              <li
                key={hobby}
                className="max-w-full rounded-md border border-support/20 bg-support-soft px-2 py-[5px] text-[10px] wrap-anywhere text-support"
              >
                {hobby}
              </li>
            ))}
          </ul>
        </Popover>
      )}
    </div>
  );
}
import { Popover } from "../ui/Popover";
