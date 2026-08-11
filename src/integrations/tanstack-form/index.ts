import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { lazy } from "react";

const Input = lazy(() => import("#/components/form/input"));
const Button = lazy(() => import("#/components/form/button"));
const Textarea = lazy(() => import("#/components/form/textarea"));

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

export const { useAppForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { Input, Textarea },
  formComponents: {
    Button,
  },
});
