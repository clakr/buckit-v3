import { IconMoodWrrr, IconPlus, type ReactNode } from "@tabler/icons-react";

import { Button } from "#/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty";
import { Spinner } from "#/components/ui/spinner";

type Props = { title: string; description: string } & (
  | { state: "loading" }
  | { state: "error"; content: ReactNode }
  | { state: "empty"; icon: ReactNode; buttonText: string; handleButtonClick: () => void }
);

export function StateTemplate(props: Props) {
  if (props.state === "loading")
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Spinner />
          </EmptyMedia>
          <EmptyTitle>{props.title}</EmptyTitle>
          <EmptyDescription>{props.description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  if (props.state === "error")
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconMoodWrrr />
          </EmptyMedia>
          <EmptyTitle>{props.title}</EmptyTitle>
          <EmptyDescription>{props.description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">{props.content}</EmptyContent>
      </Empty>
    );

  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">{props.icon}</EmptyMedia>
        <EmptyTitle>{props.title}</EmptyTitle>
        <EmptyDescription>{props.description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={props.handleButtonClick}>
          <IconPlus />
          {props.buttonText}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
