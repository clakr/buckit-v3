import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { lazy } from "react";

const Input = lazy(() => import("#/components/form/input"));
const Button = lazy(() => import("#/components/form/button.tsx"));

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { Input },
  formComponents: {
    Button,
  },
});
