import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function PlaceholderPage(props: { title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{props.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {props.description ?? "This page is scaffolded; implementation is next."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming next</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Gateway connection state + reconnect</li>
            <li>Task CRUD + runs + streaming progress</li>
            <li>Redacted logs + diagnostics</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
