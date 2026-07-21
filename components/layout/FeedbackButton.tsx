import { MessageSquare } from "lucide-react";

const FEEDBACK_FORM_URL = "https://forms.gle/hbQ1zQ4EPhiemc6h7";

// Rendered from the root layout so it shows on every page. Sits below dialogs
// (z-40/50) and the mobile detail panel so it never blocks them.
export function FeedbackButton() {
  return (
    <a
      href={FEEDBACK_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-glow transition hover:border-primary hover:text-primary"
    >
      <MessageSquare size={16} />
      <span className="hidden sm:inline">서비스 피드백</span>
    </a>
  );
}
