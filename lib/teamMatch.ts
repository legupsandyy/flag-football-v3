import { NFL_TEAMS } from "./nflTeams";

// Games store team names as typed by the admin ("Chiefs", "Kansas City Chiefs", "KC").
// This finds the matching NFL team so we can show its logo and color.
export function findTeam(text: string) {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  return (
    NFL_TEAMS.find((x) => x.id === t) ??
    NFL_TEAMS.find((x) => x.name.toLowerCase() === t) ??
    NFL_TEAMS.find((x) => t.endsWith(x.name.toLowerCase())) ??
    NFL_TEAMS.find((x) => t.includes(x.name.toLowerCase())) ??
    null
  );
}
