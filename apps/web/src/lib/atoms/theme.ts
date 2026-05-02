import { atomWithStorage } from "jotai/utils";

export type Theme = "dark" | "light";

const themeAtom = atomWithStorage<Theme>("theme", "dark");

export default themeAtom;
