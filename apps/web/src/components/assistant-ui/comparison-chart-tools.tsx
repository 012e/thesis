import { useMemo } from "react";
import {
  makeAssistantToolUI,
  useAssistantInstructions,
  useAssistantTool,
} from "@assistant-ui/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const RenderLineGraphInput = z.object({
  title: z.string().min(1).max(120).describe("Short chart title"),
  description: z
    .string()
    .max(240)
    .optional()
    .describe("Optional context about the data or its source"),
  unit: z
    .string()
    .min(1)
    .max(24)
    .optional()
    .describe("Shared unit for all values, such as ms, ops/s, or MB"),
  series: z
    .array(
      z.object({
        label: z.string().min(1).max(40).describe("Displayed series name"),
        values: z
          .array(z.number())
          .min(1)
          .max(20)
          .describe(
            "Numeric values in the same order as the xAxis labels; provide exactly one value per label",
          ),
      }),
    )
    .min(1)
    .max(SERIES_COLORS.length)
    .describe("One to five lines to display"),
  xAxis: z
    .array(z.string().min(1).max(40))
    .min(1)
    .max(20)
    .describe("Ordered x-axis labels from left to right"),
});

export type LineGraphProps = z.infer<typeof RenderLineGraphInput>;

const LegacyLineGraphInput = z.object({
  title: RenderLineGraphInput.shape.title,
  description: RenderLineGraphInput.shape.description,
  unit: RenderLineGraphInput.shape.unit,
  series: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
      }),
    )
    .min(1)
    .max(SERIES_COLORS.length),
  data: z
    .array(
      z.object({
        label: z.string(),
        values: z.record(z.string(), z.number()),
      }),
    )
    .min(1)
    .max(20),
});

const RenderLineGraphToolUI = makeAssistantToolUI({
  toolName: "render_line_graph",
  render: ({ args }) => {
    const parsed = RenderLineGraphInput.safeParse(args);
    if (parsed.success) return <LineGraph {...parsed.data} />;

    const legacy = LegacyLineGraphInput.safeParse(args);
    if (!legacy.success) return null;

    return <LineGraph {...convertLegacyInput(legacy.data)} />;
  },
});

export function LineGraphAssistantTools() {
  useAssistantInstructions(
    "The render_line_graph client tool is always available. Use it to show trends or compare one to five series over an ordered x-axis. Each series must contain exactly one numeric value for every xAxis label, in the same order. All values in one graph must use the same unit.",
  );

  const renderLineGraphTool = useMemo(
    () => ({
      toolName: "render_line_graph",
      description:
        "Render an inline line graph with one to five data series over an ordered set of labeled points.",
      parameters: RenderLineGraphInput,
      execute: (input: LineGraphProps) => ({
        status: "success",
        ...input,
      }),
    }),
    [],
  );

  useAssistantTool(renderLineGraphTool);

  return <RenderLineGraphToolUI />;
}

export function LineGraph({
  title,
  description,
  unit,
  series,
  xAxis,
}: LineGraphProps) {
  const config = Object.fromEntries(
    series.map(({ label }, index) => [
      `series_${index}`,
      {
        label,
        color: SERIES_COLORS[index],
      },
    ]),
  ) satisfies ChartConfig;

  const chartData = xAxis.map((label, pointIndex) => {
    const point: Record<string, number | string> = { label };

    series.forEach(({ values }, seriesIndex) => {
      const value = values[pointIndex];
      if (value !== undefined) point[`series_${seriesIndex}`] = value;
    });

    return point;
  });

  return (
    <Card className="my-3 w-full" size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {(description || unit) && (
          <CardDescription>
            {[description, unit ? `Unit: ${unit}` : undefined]
              .filter(Boolean)
              .join(" · ")}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-64 w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 4, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              minTickGap={16}
              tickFormatter={(value: string) =>
                value.length > 14 ? `${value.slice(0, 13)}…` : value
              }
            />
            <YAxis axisLine={false} tickLine={false} width={48} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {config[String(name) as keyof typeof config]?.label ??
                          String(name)}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {Number(value).toLocaleString()}
                        {unit ? ` ${unit}` : ""}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {series.map((_, index) => {
              const key = `series_${index}`;

              return (
                <Line
                  key={key}
                  dataKey={key}
                  type="linear"
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  dot={xAxis.length <= 12}
                  activeDot={{ r: 4 }}
                />
              );
            })}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function convertLegacyInput(
  input: z.infer<typeof LegacyLineGraphInput>,
): LineGraphProps {
  return {
    title: input.title,
    description: input.description,
    unit: input.unit,
    xAxis: input.data.map(({ label }) => label),
    series: input.series.map(({ key, label }, seriesIndex) => ({
      label,
      values: input.data.map(({ values }) => {
        const matchingEntry = Object.entries(values).find(
          ([valueKey]) =>
            valueKey.toLowerCase() === key.toLowerCase() ||
            valueKey.toLowerCase() === label.toLowerCase(),
        );

        return matchingEntry?.[1] ?? Object.values(values)[seriesIndex] ?? 0;
      }),
    })),
  };
}
