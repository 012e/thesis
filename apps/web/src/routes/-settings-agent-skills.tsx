import { useEffect, useState } from "react";
import {
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import type { AgentSkillDto, AgentSkillSearchModeDto } from "@repo/shared-dto";

import { Mascot } from "@/components/mascot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  useAgentSkillSearch,
  useAgentSkills,
  useCreateAgentSkill,
  useDeleteAgentSkill,
  useUpdateAgentSkill,
} from "@/hooks/use-agent-skills";
import { useToast as toast } from "@/hooks/use-toast";

export function AgentSkillsTab() {
  const skills = useAgentSkills();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<AgentSkillSearchModeDto>("text");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AgentSkillDto | null>(null);

  const deleteSkill = useDeleteAgentSkill();

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  const isSearching = debouncedQuery.length > 0;
  const search = useAgentSkillSearch(
    { q: debouncedQuery, mode, limit: 50 },
    isSearching,
  );

  const handleNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (skill: AgentSkillDto) => {
    setEditing(skill);
    setDialogOpen(true);
  };

  const handleDelete = (skill: AgentSkillDto) => {
    if (!window.confirm(`Delete the "${skill.name}" skill?`)) {
      return;
    }
    deleteSkill.mutate(skill.id, {
      onSuccess: (ok) =>
        ok
          ? toast.success("Skill deleted")
          : toast.error("Skill not found"),
      onError: (error: Error) => toast.error(error.message),
    });
  };

  const listSkills = skills.data ?? [];
  const resultSkills = search.data?.items ?? [];

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="grid gap-1.5">
              <CardTitle>Agent Skills</CardTitle>
              <CardDescription>
                Reusable instructions your assistant can apply. Search them by
                keyword or by meaning.
              </CardDescription>
            </div>
            <Button type="button" onClick={handleNew}>
              <IconPlus />
              New skill
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your skills"
                className="pl-9"
              />
            </div>
            <Select
              value={mode}
              onValueChange={(value) =>
                value !== null && setMode(value as AgentSkillSearchModeDto)
              }
            >
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text search</SelectItem>
                <SelectItem value="embedding">Semantic search</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isSearching ? (
            search.isLoading ? (
              <CenteredNote>
                <Spinner className="size-4" /> Searching…
              </CenteredNote>
            ) : search.isError ? (
              <CenteredNote className="text-destructive">
                Failed to search skills.
              </CenteredNote>
            ) : resultSkills.length === 0 ? (
              <CenteredNote>No skills match “{debouncedQuery}”.</CenteredNote>
            ) : (
              <div className="grid gap-3">
                {resultSkills.map((skill) => (
                  <SkillRow
                    key={skill.id}
                    skill={skill}
                    score={skill.score}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    deleting={
                      deleteSkill.isPending &&
                      deleteSkill.variables === skill.id
                    }
                  />
                ))}
              </div>
            )
          ) : skills.isLoading ? (
            <CenteredNote>
              <Spinner className="size-4" /> Loading skills…
            </CenteredNote>
          ) : skills.isError ? (
            <CenteredNote className="text-destructive">
              Failed to load skills.
            </CenteredNote>
          ) : listSkills.length === 0 ? (
            <CenteredNote>
              No skills yet. Create your first one.
            </CenteredNote>
          ) : (
            <div className="grid gap-3">
              {listSkills.map((skill) => (
                <SkillRow
                  key={skill.id}
                  skill={skill}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  deleting={
                    deleteSkill.isPending && deleteSkill.variables === skill.id
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SkillDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        skill={editing}
      />
    </div>
  );
}

function CenteredNote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-2 border border-dashed p-6 text-sm text-muted-foreground ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function SkillRow({
  skill,
  score,
  onEdit,
  onDelete,
  deleting,
}: {
  skill: AgentSkillDto;
  score?: number;
  onEdit: (skill: AgentSkillDto) => void;
  onDelete: (skill: AgentSkillDto) => void;
  deleting: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Mascot className="size-5 opacity-70" />
            <span className="font-medium">{skill.name}</span>
            {skill.isDefault && <Badge variant="secondary">default</Badge>}
            {typeof score === "number" && (
              <Badge variant="outline">{score.toFixed(2)}</Badge>
            )}
          </div>
          {skill.description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {skill.description}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onEdit(skill)}
            aria-label={`Edit ${skill.name}`}
          >
            <IconPencil />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={deleting}
            onClick={() => onDelete(skill)}
            aria-label={`Delete ${skill.name}`}
          >
            <IconTrash />
          </Button>
        </div>
      </div>
      <p className="line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
        {skill.content}
      </p>
    </div>
  );
}

function SkillDialog({
  open,
  onOpenChange,
  skill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: AgentSkillDto | null;
}) {
  const createSkill = useCreateAgentSkill();
  const updateSkill = useUpdateAgentSkill();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(skill?.name ?? "");
    setDescription(skill?.description ?? "");
    setContent(skill?.content ?? "");
  }, [open, skill]);

  const isEditing = skill !== null;
  const isPending = createSkill.isPending || updateSkill.isPending;
  const canSubmit = name.trim().length > 0 && content.trim().length > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const payload = {
      name: name.trim(),
      description: description.trim(),
      content: content.trim(),
    };

    if (isEditing) {
      updateSkill.mutate(
        { id: skill.id, ...payload },
        {
          onSuccess: (updated) => {
            if (!updated) {
              toast.error("Skill not found");
              return;
            }
            toast.success("Skill updated");
            onOpenChange(false);
          },
          onError: (error: Error) => toast.error(error.message),
        },
      );
    } else {
      createSkill.mutate(payload, {
        onSuccess: () => {
          toast.success("Skill created");
          onOpenChange(false);
        },
        onError: (error: Error) => toast.error(error.message),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit skill" : "New skill"}</DialogTitle>
            <DialogDescription>
              Skills are private to your account and power your assistant.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-2">
            <Field>
              <FieldLabel htmlFor="skill-name">Name</FieldLabel>
              <Input
                id="skill-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                placeholder="Summarize Thread"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="skill-description">Description</FieldLabel>
              <Input
                id="skill-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                placeholder="What this skill is for"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="skill-content">Instructions</FieldLabel>
              <Textarea
                id="skill-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={8}
                placeholder="Describe what the assistant should do…"
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isPending}>
              {isPending
                ? "Saving…"
                : isEditing
                  ? "Save changes"
                  : "Create skill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
