import { useSearchParams } from "react-router-dom";
import type { DirectoryState } from "../types/directory";
import {
  readDirectoryState,
  writeDirectoryState,
} from "../utils/directoryState";

export function useDirectoryState() {
  const [params, setParams] = useSearchParams();
  const state = readDirectoryState(params);

  function update(patch: Partial<DirectoryState>, replace = false) {
    setParams((current) => writeDirectoryState(current, patch), { replace });
  }

  function toggle(kind: "nationalities" | "hobbies", value: string) {
    const selected = state[kind];
    update({
      [kind]: selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    });
  }

  function clearFilters() {
    update({ q: "", nationalities: [], hobbies: [] });
  }

  return { state, update, toggle, clearFilters };
}
