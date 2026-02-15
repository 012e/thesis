import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@/lib/utils";
import { buttonVariants as buttonVariantsFromVariants } from "./variants";

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & Parameters<typeof buttonVariantsFromVariants>[0]) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariantsFromVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
