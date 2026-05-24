import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "@/components/reui/sortable";
import type { PollPostContentDto } from "@repo/shared-dto";
import {
  IconX,
  IconPlus,
  IconGripVertical,
  IconTrash,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface PollCreatorProps {
  onPollChange: (poll: PollPostContentDto | undefined) => void;
  onClose: () => void;
}

function generateOptionId(): string {
  return `opt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

type PollOption = { id: string; label: string };

export function PollCreator({ onPollChange, onClose }: PollCreatorProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<PollOption[]>(() => [
    { id: generateOptionId(), label: "" },
    { id: generateOptionId(), label: "" },
  ]);
  const [allowsMultipleSelections, setAllowsMultipleSelections] =
    useState(false);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(1);

  useEffect(() => {
    const validOptions = options.filter((o) => o.label.trim() !== "");

    if (question.trim() === "" || validOptions.length < 2) {
      onPollChange(undefined);
      return;
    }

    const poll: PollPostContentDto = {
      question: question.trim(),
      options: validOptions.map((o) => ({
        id: o.id,
        label: o.label.trim(),
      })),
      allowsMultipleSelections,
      closesAt: hasExpiration
        ? new Date(
            Date.now() + expirationDays * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null,
    };

    onPollChange(poll);
  }, [
    question,
    options,
    allowsMultipleSelections,
    hasExpiration,
    expirationDays,
    onPollChange,
  ]);

  const handleQuestionChange = (value: string) => {
    setQuestion(value);
  };

  const handleOptionChange = (id: string, value: string) => {
    setOptions(
      options.map((option) =>
        option.id === id ? { ...option, label: value } : option,
      ),
    );
  };

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, { id: generateOptionId(), label: "" }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter((option) => option.id !== id));
  };

  const handleMultipleSelectionsChange = (checked: boolean) => {
    setAllowsMultipleSelections(checked);
  };

  const handleExpirationChange = (checked: boolean) => {
    setHasExpiration(checked);
  };

  const handleExpirationDaysChange = (days: number) => {
    setExpirationDays(days);
  };

  const validOptions = options.filter((o) => o.label.trim() !== "");
  const isValid = question.trim() !== "" && validOptions.length >= 2;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold">Create a Poll</h4>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={onClose}
        >
          <IconX className="w-4 h-4" />
        </Button>
      </div>

      {/* Question */}
      <div className="mb-4">
        <Input
          placeholder="Ask a question..."
          value={question}
          onChange={(e) => handleQuestionChange(e.target.value)}
          className="text-base"
        />
      </div>

      {/* Options */}
      <Sortable
        value={options}
        onValueChange={setOptions}
        getItemValue={(option) => option.id}
        className="space-y-2 mb-4"
      >
        {options.map((option, index) => (
          <SortableItem
            key={option.id}
            value={option.id}
            className="flex gap-2 items-center group"
          >
            <SortableItemHandle className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              <IconGripVertical className="w-4 h-4" />
            </SortableItemHandle>
            <Input
              placeholder={`Option ${index + 1}`}
              value={option.label}
              onChange={(e) => handleOptionChange(option.id, e.target.value)}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-8 h-8 text-muted-foreground hover:text-destructive",
                options.length <= 2 && "opacity-0 pointer-events-none",
              )}
              onClick={() => removeOption(option.id)}
            >
              <IconTrash className="w-4 h-4" />
            </Button>
          </SortableItem>
        ))}
      </Sortable>

      {/* Add option button */}
      {options.length < 10 && (
        <Button
          variant="outline"
          size="sm"
          className="mb-4 w-full"
          onClick={addOption}
        >
          <IconPlus className="mr-2 w-4 h-4" />
          Add option
        </Button>
      )}

      {/* Poll settings */}
      <div className="pt-4 space-y-3 border-t">
        <label className="flex gap-3 items-center cursor-pointer">
          <input
            type="checkbox"
            checked={allowsMultipleSelections}
            onChange={(e) => handleMultipleSelectionsChange(e.target.checked)}
            className="w-4 h-4 border-gray-300"
          />
          <span className="text-sm">Allow multiple selections</span>
        </label>

        <label className="flex gap-3 items-center cursor-pointer">
          <input
            type="checkbox"
            checked={hasExpiration}
            onChange={(e) => handleExpirationChange(e.target.checked)}
            className="w-4 h-4 border-gray-300"
          />
          <span className="text-sm">Set poll duration</span>
        </label>

        {hasExpiration && (
          <div className="flex gap-2 items-center ml-7">
            <select
              value={expirationDays}
              onChange={(e) =>
                handleExpirationDaysChange(parseInt(e.target.value))
              }
              className="px-3 py-1.5 text-sm border bg-background"
            >
              <option value={1}>1 day</option>
              <option value={2}>2 days</option>
              <option value={3}>3 days</option>
              <option value={7}>1 week</option>
              <option value={14}>2 weeks</option>
              <option value={30}>1 month</option>
            </select>
          </div>
        )}
      </div>

      {/* Validation message */}
      {!isValid &&
        (question.trim() !== "" ||
          options.some((o) => o.label.trim() !== "")) && (
          <p className="mt-3 text-sm text-amber-600">
            Polls need a question and at least 2 options
          </p>
        )}
    </div>
  );
}
