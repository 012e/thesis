import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 68 30"
      aria-hidden="true"
      {...props}
    >
      <text
        x="34"
        y="16"
        fill="currentColor"
        dominantBaseline="middle"
        fontFamily='ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
        fontSize="24"
        fontWeight="700"
        textAnchor="middle"
      >
        Toin
      </text>
    </svg>
  );
}
