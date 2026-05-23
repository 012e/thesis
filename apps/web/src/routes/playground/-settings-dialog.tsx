import { useAtom } from "jotai";
import { IconSettings } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import playgroundSettingsAtom from "@/lib/atoms/playground-settings";
import type { PlaygroundKeybinding, PlaygroundTheme } from "@/lib/atoms/playground-settings";

export function PlaygroundSettingsDialog() {
  const [settings, setSettings] = useAtom(playgroundSettingsAtom);

  return (
    <Dialog>
      <DialogTrigger className="flex items-center gap-1.5 border p-1.5 text-sm transition-colors hover:bg-accent">
        <IconSettings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Playground settings</DialogTitle>
          <DialogDescription>
            Configure the editor appearance and common keyboard behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="playground-theme">Theme</Label>
            <Select
              value={settings.theme}
              onValueChange={(value) =>
                value !== null &&
                setSettings((current) => ({
                  ...current,
                  theme: value as PlaygroundTheme,
                }))
              }
            >
              <SelectTrigger id="playground-theme" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Follow app theme</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="playground-keybinding">Keybinding</Label>
            <Select
              value={settings.keybinding}
              onValueChange={(value) =>
                value !== null &&
                setSettings((current) => ({
                  ...current,
                  keybinding: value as PlaygroundKeybinding,
                }))
              }
            >
              <SelectTrigger id="playground-keybinding" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  Default multi-cursor (Alt)
                </SelectItem>
                <SelectItem value="alternate">
                  Alternate multi-cursor (Ctrl/Cmd)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="playground-font-size">Font size</Label>
              <input
                id="playground-font-size"
                type="number"
                min={11}
                max={24}
                value={settings.fontSize}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    fontSize: Number(event.target.value),
                  }))
                }
                className="h-8 border bg-background px-2 text-sm outline-none focus:border-ring"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="playground-tab-size">Tab size</Label>
              <input
                id="playground-tab-size"
                type="number"
                min={2}
                max={8}
                value={settings.tabSize}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    tabSize: Number(event.target.value),
                  }))
                }
                className="h-8 border bg-background px-2 text-sm outline-none focus:border-ring"
              />
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 border px-3 py-2 text-sm">
            <span>Word wrap</span>
            <input
              type="checkbox"
              checked={settings.wordWrap === "on"}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  wordWrap: event.target.checked ? "on" : "off",
                }))
              }
            />
          </label>

          <label className="flex items-center justify-between gap-3 border px-3 py-2 text-sm">
            <span>Minimap</span>
            <input
              type="checkbox"
              checked={settings.minimap}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  minimap: event.target.checked,
                }))
              }
            />
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
