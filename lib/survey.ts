// The November 2026 user survey: one link and one closing time, shared by the
// dashboard banner and the timetable nudge.
export const SURVEY_URL = "https://forms.gle/fPrWSTQJFMCLVQTV9";

/** The survey link tagged with where it was clicked. GA4 records outbound
    clicks with their full URL on its own, so the tag tells the dashboard
    banner and the timetable nudge apart without any extra tracking. */
export function surveyLink(from: "dashboard" | "timetable") {
  return `${SURVEY_URL}?src=${from}`;
}
export const SURVEY_ENDS_AT = Date.parse("2026-11-22T00:00:00+09:00");

// Set on this device once someone opens the survey or closes the nudge, so
// it is not offered again.
const DONE_KEY = "plantogether.survey.2026-11.done";

export function surveyDone() {
  try {
    return window.localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSurveyDone() {
  try {
    window.localStorage.setItem(DONE_KEY, "1");
  } catch {
    // Private browsing: the nudge may come back next visit, which is fine.
  }
}
