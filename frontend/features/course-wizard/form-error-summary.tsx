import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function FormErrorSummary({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <Alert className="border-red-200 bg-red-50/70 text-red-800">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <AlertTitle>请检查当前步骤</AlertTitle>
          <AlertDescription className="text-red-700">
            <ul className="list-disc space-y-1 pl-5">
              {messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
