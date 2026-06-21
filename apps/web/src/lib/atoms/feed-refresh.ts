import { atom } from "jotai";

export const homeFeedRefreshRequestAtom = atom(0);
export const homeFeedRefreshPendingAtom = atom(false);

export const requestHomeFeedRefreshAtom = atom(
  null,
  (get, set) => {
    if (get(homeFeedRefreshPendingAtom)) {
      return;
    }

    set(homeFeedRefreshPendingAtom, true);
    set(homeFeedRefreshRequestAtom, (request) => request + 1);
  },
);

export const completeHomeFeedRefreshAtom = atom(null, (_get, set) => {
  set(homeFeedRefreshPendingAtom, false);
});
