import type { PropsWithChildren } from "react";

import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { useFormContext } from "#/integrations/tanstack-form";

export default function SubmitButton({ children }: PropsWithChildren) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" disabled={isSubmitting}>
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
