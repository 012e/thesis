import { atomWithStorage } from "jotai/utils";

const isThreadListOpenAtom = atomWithStorage<boolean>(
  "chat_thread_list_open",
  true,
);

export default isThreadListOpenAtom;
