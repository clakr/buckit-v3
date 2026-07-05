import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <main>
      <h1 className="bg-red-400">hello world!</h1>
    </main>
  );
}
