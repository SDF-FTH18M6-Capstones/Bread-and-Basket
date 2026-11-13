export const kes = (amount) => `KES ${amount.toLocaleString("en-KE")}`;

export function hoursLeft(deadline) {
  return (new Date(deadline) - Date.now()) / 3_600_000;
}

// The API contract counts "ending soon" as a deadline within the next 48 hours.
export const isEndingSoon = (deadline) => hoursLeft(deadline) <= 48;

export function timeLeft(deadline) {
  const hours = hoursLeft(deadline);
  if (hours <= 0) return "Ended";
  if (hours < 1) return "Less than 1 hour left";
  if (hours < 24) return `${Math.floor(hours)} hr left`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} left`;
}
