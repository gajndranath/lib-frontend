import { useEffect, useState, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { LetterAvatar } from "@/components/chat/LetterAvatar";

export type CallState = "idle" | "outgoing" | "incoming" | "active" | "ended";

interface CallPanelProps {
  callState: CallState;
  contactName: string;
  onAccept?: () => void;
  onDecline?: () => void;
  onEnd?: () => void;
  onToggleMute?: () => void;
  onToggleSpeaker?: () => void;
  isMuted?: boolean;
  isSpeakerOn?: boolean;
  remoteMuted?: boolean;
}

export const CallPanel: React.FC<CallPanelProps> = ({
  callState,
  contactName,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleSpeaker,
  isMuted = false,
  isSpeakerOn = false,
  remoteMuted = false,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  // Timer for active call
  useEffect(() => {
    if (callState !== "active") {
      startTimeRef.current = null;
      return;
    }

    // Record start time
    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setCallDuration(elapsed);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      startTimeRef.current = null;
    };
  }, [callState]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (callState === "idle" || callState === "ended") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
      <div className="text-center text-white space-y-8 max-w-md w-full px-6">
        {/* Contact Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <LetterAvatar name={contactName} size={120} />
            {callState === "active" && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white text-green-600 px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                {formatDuration(callDuration)}
              </div>
            )}
          </div>
        </div>

        {/* Contact Name */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-semibold">{contactName}</h2>
            {callState === "active" && remoteMuted && (
              <div className="flex items-center gap-1 px-3 py-1 bg-red-500/30 rounded-full">
                <MicOff className="h-4 w-4 text-red-300" />
                <span className="text-sm text-red-200">muted</span>
              </div>
            )}
          </div>
          {callState === "incoming" && (
            <p className="text-lg text-green-100 animate-pulse">
              Incoming voice call...
            </p>
          )}
          {callState === "outgoing" && (
            <p className="text-lg text-green-100 animate-pulse">Calling...</p>
          )}
          {callState === "active" && (
            <p className="text-lg text-green-100">Active call</p>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-6 pt-8">
          {/* Incoming Call Controls */}
          {callState === "incoming" && (
            <>
              <button
                onClick={onDecline}
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl flex items-center justify-center transition-colors"
              >
                <PhoneOff className="h-6 w-6 text-white" strokeWidth={3} />
              </button>
              <button
                onClick={onAccept}
                className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700 shadow-2xl flex items-center justify-center animate-pulse transition-colors"
              >
                <Phone className="h-6 w-6 text-white" strokeWidth={3} />
              </button>
            </>
          )}

          {/* Outgoing Call Controls */}
          {callState === "outgoing" && (
            <button
              onClick={onDecline}
              className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl flex items-center justify-center transition-colors"
            >
              <PhoneOff className="h-6 w-6 text-white" strokeWidth={3} />
            </button>
          )}

          {/* Active Call Controls */}
          {callState === "active" && (
            <>
              {/* Mute Button */}
              <button
                onClick={onToggleMute}
                className={`h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-colors ${
                  isMuted
                    ? "bg-gray-700 hover:bg-gray-800"
                    : "bg-white/20 hover:bg-white/30"
                }`}
              >
                {isMuted ? (
                  <MicOff className="h-5 w-5 text-white" strokeWidth={3} />
                ) : (
                  <Mic className="h-5 w-5 text-white" strokeWidth={3} />
                )}
              </button>

              {/* End Call Button */}
              <button
                onClick={onEnd}
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl flex items-center justify-center transition-colors"
              >
                <PhoneOff className="h-6 w-6 text-white" strokeWidth={3} />
              </button>

              {/* Speaker Button */}
              <button
                onClick={onToggleSpeaker}
                className={`h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-colors ${
                  isSpeakerOn
                    ? "bg-white/30 hover:bg-white/40"
                    : "bg-white/20 hover:bg-white/30"
                }`}
              >
                {isSpeakerOn ? (
                  <Volume2 className="h-5 w-5 text-white" strokeWidth={3} />
                ) : (
                  <VolumeX className="h-5 w-5 text-white" strokeWidth={3} />
                )}
              </button>
            </>
          )}
        </div>

        {/* Hidden audio element for remote stream */}
        <audio id="remote-audio" autoPlay playsInline hidden />
      </div>
    </div>
  );
};
