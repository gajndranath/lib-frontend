import React from "react";
import { Check, CheckCheck, Clock } from "lucide-react";

export type MessageStatus = "PENDING" | "SENT" | "DELIVERED" | "READ";

interface StatusIconProps {
  status?: MessageStatus;
  size?: "sm" | "md" | "lg";
}

/**
 * WhatsApp-style message status icons
 * PENDING = ⏱️ (clock icon - offline/not sent)
 * SENT = ✓ (single tick - sent but not delivered)
 * DELIVERED = ✓✓ (double tick - delivered but not read)
 * READ = ✓✓ (blue double tick - read by recipient)
 */
export const StatusIcon: React.FC<StatusIconProps> = ({
  status,
  size = "md",
}) => {
  const sizeMap = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const iconSize = sizeMap[size];

  switch (status) {
    case "READ":
      return <CheckCheck className={`${iconSize} text-blue-500`} />;
    case "DELIVERED":
      return <CheckCheck className={`${iconSize} text-gray-400`} />;
    case "SENT":
      return <Check className={`${iconSize} text-gray-400`} />;
    case "PENDING":
      return <Clock className={`${iconSize} text-orange-400 animate-spin`} />;
    default:
      return null;
  }
};

/**
 * Typing indicator animation
 */
export const TypingIndicator: React.FC<{ name?: string }> = ({
  name = "User",
}) => {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-gray-600">{name} is typing</span>
      <div className="flex gap-1">
        <span
          className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: "0s" }}
        ></span>
        <span
          className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: "0.2s" }}
        ></span>
        <span
          className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: "0.4s" }}
        ></span>
      </div>
    </div>
  );
};
