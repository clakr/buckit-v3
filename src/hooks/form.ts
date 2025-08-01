import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { lazy } from "react";

export const { fieldContext, useFieldContext, formContext, useFormContext } =
	createFormHookContexts();

export const { useAppForm, withForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		Input: lazy(() => import("@/components/form/input")),
		Textarea: lazy(() => import("@/components/form/textarea")),
		Radio: lazy(() => import("@/components/form/radio")),
	},
	formComponents: {
		Button: lazy(() => import("@/components/form/button")),
	},
});
