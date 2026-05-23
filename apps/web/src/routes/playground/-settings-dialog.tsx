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
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import playgroundSettingsAtom from "@/lib/atoms/playground-settings";
import type {
  PlaygroundKeybinding,
  PlaygroundTheme,
} from "@/lib/atoms/playground-settings";

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

        <form
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="playground-theme">Theme</FieldLabel>
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
                  <SelectGroup>
                    <SelectItem value="auto">Follow app theme</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="playground-keybinding">
                Keybinding
              </FieldLabel>
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
                  <SelectGroup>
                    <SelectItem value="default">
                      Default multi-cursor (Alt)
                    </SelectItem>
                    <SelectItem value="alternate">
                      Alternate multi-cursor (Ctrl/Cmd)
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="playground-font-size">
                  Font size
                </FieldLabel>
                <Input
                  id="playground-font-size"
                  name="fontSize"
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
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="playground-tab-size">Tab size</FieldLabel>
                <Input
                  id="playground-tab-size"
                  name="tabSize"
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
                />
              </Field>
            </div>

            <Field orientation="horizontal" className="justify-between border p-3">
              <FieldContent>
                <FieldTitle>Word wrap</FieldTitle>
              </FieldContent>
              <Switch
                aria-label="Toggle word wrap"
                checked={settings.wordWrap === "on"}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    wordWrap: checked ? "on" : "off",
                  }))
                }
              />
            </Field>

            <Field orientation="horizontal" className="justify-between border p-3">
              <FieldContent>
                <FieldTitle>Minimap</FieldTitle>
              </FieldContent>
              <Switch
                aria-label="Toggle minimap"
                checked={settings.minimap}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    minimap: checked,
                  }))
                }
              />
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
