import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      aria-hidden="true"
      {...props}
    >
      <g id="icon-letter-t" fill="currentColor">
        <rect x="20" y="20" width="60" height="20" />
        <rect x="40" y="39" width="20" height="41" />
      </g>
    </svg>
  );
}
