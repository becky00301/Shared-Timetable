import { messages, type MessageKey } from "@/lib/i18n/messages";

/** Kept out of LandingContent: that is a client module, and the home page
    builds its FAQ structured data from this same list on the server. */
export const LANDING_FAQ: [MessageKey, MessageKey][] = [
  ["landing.faq.q0", "landing.faq.a0"],
  ["landing.faq.q1", "landing.faq.a1"],
  ["landing.faq.q2", "landing.faq.a2"],
  ["landing.faq.q3", "landing.faq.a3"],
  ["landing.faq.q4", "landing.faq.a4"],
  ["landing.faq.q5", "landing.faq.a5"]
];

/** The landing's questions as FAQPage data, in the language a page is served
    in, so the answers can appear directly under its search result. */
export function landingFaqStructuredData(locale: "ko" | "en") {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: LANDING_FAQ.map(([question, answer]) => ({
      "@type": "Question",
      name: messages[question][locale],
      acceptedAnswer: { "@type": "Answer", text: messages[answer][locale] }
    }))
  };
}
