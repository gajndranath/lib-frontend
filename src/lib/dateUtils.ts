/**
 * Format date for chat message separators (WhatsApp style)
 * Returns: "Today", "Yesterday", or formatted date like "2 Feb"
 */
export function formatChatDate(date: Date | string): string {
  const msgDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const msgDateOnly = new Date(
    msgDate.getFullYear(),
    msgDate.getMonth(),
    msgDate.getDate(),
  );
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const yesterdayOnly = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate(),
  );

  if (msgDateOnly.getTime() === todayOnly.getTime()) {
    return "Today";
  }
  if (msgDateOnly.getTime() === yesterdayOnly.getTime()) {
    return "Yesterday";
  }

  return msgDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Get date key for grouping messages (YYYY-MM-DD format)
 */
export function getMessageDateKey(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

/**
 * Format time for message (e.g., "2:30 PM")
 */
export function formatMessageTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
