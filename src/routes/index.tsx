import { Button } from "#/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <main>
      <Button>hello world!</Button>
    </main>
  );
}
