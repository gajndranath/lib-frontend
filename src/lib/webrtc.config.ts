/**
 * Optimized WebRTC configuration for clear voice calls
 * with low latency and minimal lag
 */

// ✅ WeakMap to store event handlers per peer connection (no type pollution)
const peerHandlers = new WeakMap<
  RTCPeerConnection,
  {
    handleIceConnectionStateChange: () => void;
    handleConnectionStateChange: () => void;
  }
>();

// STUN/TURN servers for NAT traversal
export const iceServers: RTCIceServer[] = [
  // Google's public STUN servers
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

// Optimized RTC configuration for voice calls
export const rtcConfiguration: RTCConfiguration = {
  iceServers,
  iceCandidatePoolSize: 10, // Pregenerate ICE candidates for faster connection
  bundlePolicy: "max-bundle", // Use single transport for all media
  rtcpMuxPolicy: "require", // Multiplex RTP and RTCP for efficiency
  iceTransportPolicy: "all", // Use both STUN and TURN
};

// Audio constraints optimized for voice calls
export const audioConstraints: MediaStreamConstraints = {
  audio: {
    echoCancellation: true, // Remove echo
    noiseSuppression: true, // Remove background noise
    autoGainControl: true, // Normalize volume levels
    channelCount: 1, // Mono audio (sufficient for voice)
    sampleRate: 48000, // High-quality sample rate
    sampleSize: 16, // 16-bit audio
    // @ts-expect-error - Browser-specific constraints not in TypeScript definitions
    googEchoCancellation: true,
    googAutoGainControl: true,
    googNoiseSuppression: true,
    googHighpassFilter: true,
    googTypingNoiseDetection: true,
  },
  video: false,
};

// Optimized SDP parameters for low latency
export const sdpSemantics = "unified-plan" as const;

/**
 * Optimize SDP for low latency and high quality audio
 */
export const optimizeSDP = (sdp: string): string => {
  let optimizedSdp = sdp;

  // Set Opus codec as preferred (best for voice)
  optimizedSdp = optimizedSdp.replace(
    /(m=audio \d+ [A-Z/]+ )(\d+)/g,
    "$1111 $2", // Prioritize Opus (usually codec 111)
  );

  // Enable Opus DTX (discontinuous transmission) for bandwidth efficiency
  if (!optimizedSdp.includes("usedtx=1")) {
    optimizedSdp = optimizedSdp.replace(/a=fmtp:111 /g, "a=fmtp:111 usedtx=1;");
  }

  // Set maximum bitrate for Opus (32kbps is optimal for voice)
  if (!optimizedSdp.includes("maxaveragebitrate")) {
    optimizedSdp = optimizedSdp.replace(
      /a=fmtp:111 /g,
      "a=fmtp:111 maxaveragebitrate=32000;",
    );
  }

  // Enable FEC (Forward Error Correction) for packet loss resilience
  if (!optimizedSdp.includes("useinbandfec=1")) {
    optimizedSdp = optimizedSdp.replace(
      /a=fmtp:111 /g,
      "a=fmtp:111 useinbandfec=1;",
    );
  }

  // Set ptime (packet time) to 20ms for low latency
  if (!optimizedSdp.includes("a=ptime:20")) {
    optimizedSdp = optimizedSdp.replace(
      /(a=rtpmap:111 opus\/48000\/2)/g,
      "$1\r\na=ptime:20",
    );
  }

  return optimizedSdp;
};

/**
 * Create optimized peer connection
 */
export const createPeerConnection = (): RTCPeerConnection => {
  const peer = new RTCPeerConnection(rtcConfiguration);

  // Enable statistics for monitoring call quality
  const handleIceConnectionStateChange = () => {
    console.log("ICE Connection State:", peer.iceConnectionState);
  };

  const handleConnectionStateChange = () => {
    console.log("Connection State:", peer.connectionState);
  };

  peer.addEventListener(
    "iceconnectionstatechange",
    handleIceConnectionStateChange,
  );
  peer.addEventListener("connectionstatechange", handleConnectionStateChange);

  // ✅ RULE: Store references for cleanup in WeakMap
  peerHandlers.set(peer, {
    handleIceConnectionStateChange,
    handleConnectionStateChange,
  });

  return peer;
};

/**
 * ✅ NEW: Cleanup peer connection and its resources
 */
export const cleanupPeerConnection = (peer: RTCPeerConnection | null): void => {
  if (!peer) return;

  try {
    // Remove event listeners from WeakMap
    const handlers = peerHandlers.get(peer);
    if (handlers) {
      peer.removeEventListener(
        "iceconnectionstatechange",
        handlers.handleIceConnectionStateChange,
      );
      peer.removeEventListener(
        "connectionstatechange",
        handlers.handleConnectionStateChange,
      );
    }

    // Close all transceivers (audio/video senders and receivers)
    peer.getSenders().forEach((sender) => {
      try {
        peer.removeTrack(sender);
      } catch (error) {
        console.error("Error removing sender:", error);
      }
    });

    peer.getReceivers().forEach((receiver) => {
      try {
        // Receiver streams are read-only, just log
        console.log("Cleaned up receiver for track:", receiver.track?.kind);
      } catch (error) {
        console.error("Error cleaning receiver:", error);
      }
    });

    // Close peer connection
    peer.close();
    console.log("✅ Peer connection cleaned up");
  } catch (error) {
    console.error("Error cleaning peer connection:", error);
  }
};

/**
 * ✅ NEW: Stop all tracks in a media stream
 */
export const stopMediaStream = (stream: MediaStream | null): void => {
  if (!stream) return;

  try {
    // Stop all audio tracks
    stream.getAudioTracks().forEach((track) => {
      console.log("🛑 Stopping audio track:", track.label);
      track.stop();
    });

    // Stop all video tracks
    stream.getVideoTracks().forEach((track) => {
      console.log("🛑 Stopping video track:", track.label);
      track.stop();
    });

    console.log("✅ All media tracks stopped");
  } catch (error) {
    console.error("Error stopping media stream:", error);
  }
};

/**
 * Get optimized audio stream with error handling
 */
export const getAudioStream = async (): Promise<MediaStream> => {
  try {
    console.log("🎤 Requesting microphone access...");
    const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);

    // Verify we got audio tracks
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new Error("No audio tracks found in stream");
    }

    console.log("✅ Audio stream obtained successfully");
    console.log("🔊 Audio track:", {
      label: audioTracks[0].label,
      enabled: audioTracks[0].enabled,
      readyState: audioTracks[0].readyState,
    });

    // Monitor audio track events
    audioTracks[0].onended = () => {
      console.warn("⚠️ Audio track ended");
    };

    audioTracks[0].onmute = () => {
      console.warn("⚠️ Audio track muted");
    };

    return stream;
  } catch (error) {
    console.error("❌ Failed to get audio stream:", error);

    if (error instanceof DOMException) {
      if (error.name === "NotAllowedError") {
        throw new Error(
          "Microphone permission denied. Please allow access in your browser settings.",
        );
      } else if (error.name === "NotFoundError") {
        throw new Error(
          "No microphone found. Please connect a microphone and try again.",
        );
      }
    }

    throw new Error("Failed to access microphone. Please grant permission.");
  }
};

/**
 * Apply audio processing to improve quality and prevent echo
 */
export const setupAudioProcessing = (
  remoteAudio: HTMLAudioElement,
  stream: MediaStream,
): void => {
  remoteAudio.srcObject = stream;

  // We want to hear the remote user
  remoteAudio.muted = false;

  // Prevent audio feedback loop and echo
  remoteAudio.setAttribute("playsinline", "true");
  remoteAudio.setAttribute("crossorigin", "anonymous");

  // Set volume to reasonable level (not maximum to prevent distortion)
  remoteAudio.volume = 0.8;

  // Ensure audio plays immediately
  remoteAudio.autoplay = true;

  // Play the audio (some browsers require user interaction)
  remoteAudio.play().catch((err) => {
    console.warn("Autoplay failed, user interaction may be required:", err);
  });

  console.log("🔊 Remote audio configured:", {
    srcObject: !!stream,
    volume: remoteAudio.volume,
    autoplay: remoteAudio.autoplay,
  });
};

/**
 * Audio utilities for call notifications
 */

/**
 * Play ringing sound for outgoing calls
 */
export const playRingtone = (): (() => void) => {
  console.log("🔔 Playing ringtone...");

  const audioContext = new (
    window.AudioContext ||
    (
      window as unknown as typeof window & {
        webkitAudioContext: typeof AudioContext;
      }
    ).webkitAudioContext
  )();

  const playTone = () => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.frequency.value = 440; // A4
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 1); // 1 second tone
  };

  // Play tone every 2 seconds (1 second on, 1 second off)
  const interval = setInterval(playTone, 2000);
  playTone(); // Play immediately

  // Return function to stop ringtone
  return () => {
    clearInterval(interval);
    console.log("🔔 Ringtone stopped");
  };
};

/**
 * Play notification sound for incoming calls
 */
export const playNotificationSound = (): void => {
  console.log("📳 Playing notification sound...");

  try {
    const audioContext = new (
      window.AudioContext ||
      (
        window as unknown as typeof window & {
          webkitAudioContext: typeof AudioContext;
        }
      ).webkitAudioContext
    )();

    // Create a series of beeps
    const beep = (time: number, duration: number, frequency: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.frequency.value = frequency;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.setValueAtTime(0.3, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

      oscillator.start(time);
      oscillator.stop(time + duration);
    };

    const now = audioContext.currentTime;
    // Play 3 short beeps
    beep(now, 0.1, 800);
    beep(now + 0.15, 0.1, 800);
    beep(now + 0.3, 0.1, 800);
  } catch (error) {
    console.error("Failed to play notification sound:", error);
  }
};

/**
 * Format call duration in MM:SS format
 */
export const formatCallDuration = (
  startDate: Date | string,
  endDate: Date | string,
): string => {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  const durationMs = end.getTime() - start.getTime();
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

/**
 * Format call time for display (e.g., "2:45 PM")
 */
export const formatCallTime = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};
