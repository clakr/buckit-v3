import type { ComponentProps, PropsWithChildren } from "react";

import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { useFormContext } from "#/integrations/tanstack-form";

type Props = ComponentProps<"button">;

export default function SubmitButton({ children, ...rest }: Props) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" {...rest} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner />
              Submitting...
            </>
          ) : (
            children
          )}
        </Button>
      )}
    </form.Subscribe>
  );
}
