import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/buckets/create')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authed/buckets/create"!</div>
}
