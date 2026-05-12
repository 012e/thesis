import { atomWithStorage } from "jotai/utils";

export type PlaygroundTheme = "auto" | "light" | "dark";
export type PlaygroundKeybinding = "default" | "alternate";

export type PlaygroundSettings = {
  theme: PlaygroundTheme;
  keybinding: PlaygroundKeybinding;
  fontSize: number;
  tabSize: number;
  wordWrap: "on" | "off";
  minimap: boolean;
  outputHeight: number;
};

export const DEFAULT_PLAYGROUND_SETTINGS: PlaygroundSettings = {
  theme: "auto",
  keybinding: "default",
  fontSize: 14,
  tabSize: 2,
  wordWrap: "on",
  minimap: false,
  outputHeight: 256,
};

const playgroundSettingsAtom = atomWithStorage<PlaygroundSettings>(
  "playground-settings",
  DEFAULT_PLAYGROUND_SETTINGS,
);

export default playgroundSettingsAtom;
