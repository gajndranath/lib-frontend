import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chatApi, type ChatMessage } from "@/api/chat.api";
import { studentApi } from "@/api/students.api";
import { socketService } from "@/api/socket.service";
import { useAuth } from "@/hooks/useAuth";
import {
  initCrypto,
  getOrCreateKeyPair,
  encryptForRecipient,
  decryptForSelf,
} from "@/lib/crypto";
import {
  formatChatDate,
  getMessageDateKey,
  formatMessageTime,
} from "@/lib/dateUtils";
import { StatusIcon, TypingIndicator } from "@/lib/messageStatus";
import { CallPanel, type CallState } from "@/components/call/CallPanel";
import {
  createPeerConnection,
  getAudioStream,
  setupAudioProcessing,
  optimizeSDP,
  playRingtone,
  playNotificationSound,
  formatCallDuration,
  formatCallTime,
} from "@/lib/webrtc.config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LetterAvatar } from "@/components/chat/LetterAvatar";
import { toast } from "sonner";
import { Phone, Search, Send, Users, Info, Loader2 } from "lucide-react";

interface Contact {
  _id: string;
  name: string;
}

interface UiMessage {
  id: string;
  text: string;
  senderType: "Admin" | "Student";
  status?: "PENDING" | "SENT" | "DELIVERED" | "READ";
  createdAt?: string;
  isOwnMessage?: boolean;
  contentType?: "TEXT" | "CALL";
}

export default function AdminChat() {
  const queryClient = useQueryClient();
  const { admin } = useAuth();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [keyReady, setKeyReady] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [typing, setTyping] = useState(false);
  const [presence, setPresence] = useState<
    Record<string, { online: boolean; lastSeen?: string | null }>
  >({});
  const [sessionDetails, setSessionDetails] = useState<{
    slotName?: string;
    timing?: string;
    notes?: string;
  }>({});
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [showDetails, setShowDetails] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [incomingCallData, setIncomingCallData] =
    useState<CallOfferPayload | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRingtone = useRef<(() => void) | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const callStartTime = useRef<Date | null>(null);
  const callLogSent = useRef(false);
  const outgoingCallId = useRef<string | null>(null);
  const isCaller = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const pendingStatusRef = useRef<Map<string, "SENT" | "DELIVERED" | "READ">>(
    new Map(),
  );

  type ChatSocketPayload = ChatMessage & {
    encryptedPayload?: { ciphertext: string };
    tempId?: string;
  };

  type CallOfferPayload = {
    callId: string;
    from: { userId: string; userType: "Admin" | "Student" };
    sdp: RTCSessionDescriptionInit;
    conversationId?: string;
  };

  type CallAnswerPayload = { sdp: RTCSessionDescriptionInit };
  type CallIcePayload = { candidate: RTCIceCandidateInit };

  const { data: contactsData } = useQuery({
    queryKey: ["chat-contacts"],
    queryFn: async () => {
      const { data } = await studentApi.searchStudents({
        status: "ACTIVE",
        limit: 1000,
      });
      return data?.data?.students || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // Keep in cache for 20 minutes
  });

  const { data: conversationsData } = useQuery({
    queryKey: ["admin-chat-conversations"],
    queryFn: async () => {
      const { data } = await chatApi.listConversations();
      return data?.data || [];
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Query for student public key (cached for 30 minutes)
  const { data: studentPublicKeyData } = useQuery({
    queryKey: ["student-public-key", selectedContact?._id],
    queryFn: async () => {
      if (!selectedContact) return null;
      const response = await chatApi.getPublicKey(
        "Student",
        selectedContact._id,
      );
      return response.data?.data?.publicKey;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    enabled: !!selectedContact,
  });

  const contacts = useMemo<Contact[]>(() => {
    if (!Array.isArray(contactsData)) return [];
    return contactsData.map((s: { _id: string; name: string }) => ({
      _id: s._id,
      name: s.name,
    }));
  }, [contactsData]);

  const contactMap = useMemo(() => {
    return new Map(contacts.map((c) => [c._id, c]));
  }, [contacts]);

  useEffect(() => {
    if (!Array.isArray(conversationsData)) return;
    const next: Record<string, number> = {};
    conversationsData.forEach(
      (c: {
        _id: string;
        participants: Array<{ userId: string; userType: string }>;
        unreadCount?: number;
      }) => {
        const student = c.participants.find((p) => p.userType === "Student");
        if (!student) return;
        next[student.userId] = c.unreadCount || 0;
      },
    );
    setUnreadCounts(next);
  }, [conversationsData]);

  const chatList = useMemo<Contact[]>(() => {
    if (!Array.isArray(conversationsData)) return [];
    return conversationsData
      .map(
        (c: { participants: Array<{ userId: string; userType: string }> }) => {
          const student = c.participants.find((p) => p.userType === "Student");
          if (!student) return null;
          return (
            contactMap.get(student.userId) || {
              _id: student.userId,
              name: "Unknown",
            }
          );
        },
      )
      .filter(Boolean) as Contact[];
  }, [conversationsData, contactMap]);

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chatList;
    return chatList.filter((c) => c.name.toLowerCase().includes(q));
  }, [chatList, search]);

  const onlineFriends = useMemo(() => {
    return chatList.filter((c) => presence[c._id]?.online);
  }, [chatList, presence]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const chatIds = new Set(chatList.map((c) => c._id));
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) && !chatIds.has(c._id),
    );
  }, [search, contacts, chatList]);

  useEffect(() => {
    const setup = async () => {
      await initCrypto();
      const keypair = await getOrCreateKeyPair();
      await chatApi.setPublicKey(keypair.publicKey);
      setKeyReady(true);
    };
    setup();
  }, []);

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const logCallIfNeeded = useCallback(
    async (endedAt: Date) => {
      if (callLogSent.current) return;
      if (!isCaller.current) return;

      const convId = conversationId || incomingCallData?.conversationId;
      const recipient = selectedContact
        ? { id: selectedContact._id, type: "Student" as const }
        : incomingCallData
          ? {
              id: incomingCallData.from.userId,
              type: incomingCallData.from.userType,
            }
          : null;

      if (!convId || !recipient) return;

      const isMissedCall = !callStartTime.current;
      const duration = callStartTime.current
        ? formatCallDuration(callStartTime.current, endedAt)
        : null;
      const callText = isMissedCall
        ? "Missed call"
        : `Call ended • ${duration}`;

      try {
        const keypair = await getOrCreateKeyPair();
        const publicKeyRes = await chatApi.getPublicKey(
          recipient.type,
          recipient.id,
        );
        const recipientPublicKey = publicKeyRes.data?.data?.publicKey;

        if (!recipientPublicKey) return;

        const encryptedForRecipient = await encryptForRecipient(
          callText,
          recipientPublicKey,
        );
        const encryptedForSender = await encryptForRecipient(
          callText,
          keypair.publicKey,
        );

        const tempMessageId = `call_${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: tempMessageId,
            text: callText,
            senderType: "Admin",
            status: isOnline ? "SENT" : "PENDING",
            createdAt: endedAt.toISOString(),
            contentType: "CALL",
          },
        ]);

        socketService.emit("chat:send", {
          conversationId: convId,
          recipientId: recipient.id,
          recipientType: recipient.type,
          encryptedForRecipient: {
            algorithm: "sealed_box",
            ciphertext: encryptedForRecipient,
          },
          encryptedForSender: {
            algorithm: "sealed_box",
            ciphertext: encryptedForSender,
          },
          contentType: "CALL",
          senderName: "Admin",
          meta: {
            duration: duration || undefined,
            endedAt: endedAt.toISOString(),
            endedAtLabel: formatCallTime(endedAt),
            isMissedCall,
          },
        });

        callLogSent.current = true;
      } catch (error) {
        console.error("Failed to log call:", error);
      }
    },
    [conversationId, selectedContact, incomingCallData, isOnline],
  );

  const endCall = useCallback(() => {
    // Stop ringtone
    if (stopRingtone.current) {
      stopRingtone.current();
      stopRingtone.current = null;
    }

    void logCallIfNeeded(new Date());

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    setCallState("ended");
    setTimeout(() => setCallState("idle"), 1000);
    setIsMuted(false);
    setIsSpeakerOn(false);
    setRemoteMuted(false);
    setIncomingCallData(null);
    callStartTime.current = null;
    outgoingCallId.current = null;
    isCaller.current = false;
  }, [logCallIfNeeded]);

  const handleIncomingCall = useCallback(async (payload: CallOfferPayload) => {
    try {
      playNotificationSound();
      isCaller.current = false;
      callStartTime.current = null;
      callLogSent.current = false;
      setIncomingCallData(payload);
      setCallState("incoming");
    } catch (error) {
      console.error("Incoming call error:", error);
      toast.error("Failed to receive call");
    }
  }, []);

  const acceptCall = useCallback(async () => {
    if (!incomingCallData) return;

    try {
      if (stopRingtone.current) {
        stopRingtone.current();
        stopRingtone.current = null;
      }

      const peer = createPeerConnection();
      peerRef.current = peer;

      // Monitor connection state
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed") {
          toast.error("Call connection failed. Please try again.");
          endCall();
        }
      };

      peer.oniceconnectionstatechange = () => {
        // Monitor ICE connection
      };

      const localStream = await getAudioStream();
      localStreamRef.current = localStream;

      // Verify audio track is active
      const audioTrack = localStream.getAudioTracks()[0];
      if (!audioTrack || !audioTrack.enabled) {
        throw new Error("Audio track is not enabled");
      }

      localStream.getTracks().forEach((track: MediaStreamTrack) => {
        peer.addTrack(track, localStream);
      });

      peer.ontrack = (event: RTCTrackEvent) => {
        const remoteAudio = document.getElementById(
          "remote-audio",
        ) as HTMLAudioElement;
        if (remoteAudio && event.streams[0]) {
          setupAudioProcessing(remoteAudio, event.streams[0]);
        }
      };

      peer.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          socketService.emit("call:ice", {
            recipientId: incomingCallData.from.userId,
            recipientType: incomingCallData.from.userType,
            candidate: event.candidate,
            callId: incomingCallData.callId,
          });
        }
      };

      await peer.setRemoteDescription(
        new RTCSessionDescription(incomingCallData.sdp),
      );

      const answer = await peer.createAnswer();

      // Optimize SDP for low latency
      const optimizedAnswer = {
        ...answer,
        sdp: optimizeSDP(answer.sdp || ""),
      };

      await peer.setLocalDescription(optimizedAnswer);

      socketService.emit("call:answer", {
        callId: incomingCallData.callId,
        recipientId: incomingCallData.from.userId,
        recipientType: incomingCallData.from.userType,
        sdp: optimizedAnswer,
      });

      setCallState("active");
      callStartTime.current = new Date();
      callLogSent.current = false;
      isCaller.current = false;
      setIncomingCallData(null);
      toast.success("Call connected");
    } catch (error) {
      console.error("Accept call error:", error);
      toast.error("Failed to accept call");
      endCall();
    }
  }, [incomingCallData, endCall]);

  const declineCall = useCallback(() => {
    if (incomingCallData) {
      socketService.emit("call:end", {
        recipientId: incomingCallData.from.userId,
        recipientType: incomingCallData.from.userType,
        callId: incomingCallData.callId,
        conversationId: incomingCallData.conversationId,
      });
    } else if (selectedContact) {
      socketService.emit("call:end", {
        recipientId: selectedContact._id,
        recipientType: "Student",
        callId: outgoingCallId.current || undefined,
        conversationId,
      });
    }
    endCall();
  }, [incomingCallData, selectedContact, conversationId, endCall]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMutedState = !audioTrack.enabled;
        setIsMuted(newMutedState);

        // Broadcast mute status to other user
        const recipient = selectedContact
          ? { id: selectedContact._id, type: "Student" as const }
          : incomingCallData
            ? {
                id: incomingCallData.from.userId,
                type: incomingCallData.from.userType,
              }
            : null;

        if (recipient) {
          socketService.emit("call:mute-status", {
            recipientId: recipient.id,
            recipientType: recipient.type,
            isMuted: newMutedState,
          });
          console.log(newMutedState ? "🔇 Muted" : "🔊 Unmuted");
        }
      }
    }
  }, [selectedContact, incomingCallData]);

  const toggleSpeaker = useCallback(() => {
    const remoteAudio = document.getElementById(
      "remote-audio",
    ) as HTMLAudioElement;
    if (remoteAudio) {
      remoteAudio.volume = isSpeakerOn ? 0.5 : 1.0;
      setIsSpeakerOn(!isSpeakerOn);
    }
  }, [isSpeakerOn]);

  const handleEndCall = useCallback(() => {
    if (selectedContact) {
      socketService.emit("call:end", {
        recipientId: selectedContact._id,
        recipientType: "Student",
        callId: outgoingCallId.current || incomingCallData?.callId,
        conversationId,
      });
    }
    endCall();
  }, [selectedContact, incomingCallData, conversationId, endCall]);

  useEffect(() => {
    socketService.on("presence:update", (data: unknown) => {
      const p = data as {
        userId: string;
        online: boolean;
        lastSeen?: Date | null;
      };
      if (!p?.userId) return;
      setPresence((prev) => ({
        ...prev,
        [p.userId]: {
          online: p.online,
          lastSeen: p.lastSeen ? new Date(p.lastSeen).toISOString() : null,
        },
      }));
    });

    socketService.on("chat:message", async (payload: unknown) => {
      const p = payload as ChatSocketPayload;
      if (!p?.encryptedForRecipient?.ciphertext) return;
      const isCurrentConversation =
        !conversationId || p.conversationId === conversationId;

      if (!isCurrentConversation) {
        if (p._id) {
          socketService.emit("chat:delivered", { messageId: p._id });
        }
        if (p.senderId) {
          setUnreadCounts((prev) => ({
            ...prev,
            [p.senderId]: (prev[p.senderId] || 0) + 1,
          }));
        }
        return;
      }

      try {
        const keypair = await getOrCreateKeyPair();

        // Get sender's public key for decryption
        console.log(`🔑 Fetching public key for ${p.senderType} ${p.senderId}`);
        const pubKeyResponse = await chatApi.getPublicKey(
          p.senderType,
          p.senderId,
        );

        if (pubKeyResponse.error) {
          console.error(
            "❌ Failed to fetch sender public key:",
            pubKeyResponse.error,
            "Sender:",
            p.senderType,
            p.senderId,
          );
          return;
        }

        const senderPublicKey = pubKeyResponse.data?.data?.publicKey;
        if (!senderPublicKey) {
          console.error(
            "❌ No public key in response for sender",
            p.senderType,
            p.senderId,
          );
          return;
        }

        console.log(
          `✅ Got public key for ${p.senderType} ${p.senderId}, attempting decryption`,
        );

        // Decrypt using the recipient's encrypted version
        let plaintext: string;
        try {
          plaintext = await decryptForSelf(
            p.encryptedForRecipient.ciphertext,
            keypair,
            senderPublicKey,
          );
        } catch (decryptError) {
          // Skip messages that can't be decrypted (wrong sender key or incompatible format)
          console.warn(
            "⚠️ Skipping message - decryption failed:",
            p._id,
            "Sender:",
            p.senderType,
            p.senderId,
            "Error:",
            String(decryptError).slice(0, 100),
          );
          return;
        }

        const messageId = p._id;
        const pendingStatus = messageId
          ? pendingStatusRef.current.get(messageId)
          : undefined;
        if (messageId && pendingStatus) {
          pendingStatusRef.current.delete(messageId);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: messageId,
            text: plaintext,
            senderType: p.senderType,
            status: pendingStatus || p.status,
            createdAt: p.createdAt,
            isOwnMessage: String(p.senderId) === String(admin?._id || ""),
            contentType: p.contentType ?? "TEXT",
          },
        ]);

        if (p._id) {
          socketService.emit("chat:delivered", { messageId: p._id });
          // Mark as read immediately if viewing this conversation with the student
          if (
            selectedContact &&
            String(p.senderId) === String(selectedContact._id || "")
          ) {
            socketService.emit("chat:read", { messageId: p._id });
            setUnreadCounts((prev) => ({
              ...prev,
              [selectedContact._id]: 0,
            }));
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    socketService.on("chat:sent", async (payload: unknown) => {
      const p = payload as ChatSocketPayload;
      if (!p?.encryptedForSender?.ciphertext) return;

      try {
        const keypair = await getOrCreateKeyPair();

        // Get sender's public key for decryption
        const pubKeyResponse = await chatApi.getPublicKey(
          p.senderType,
          p.senderId,
        );

        if (pubKeyResponse.error) {
          console.error(
            "Failed to fetch sender public key:",
            pubKeyResponse.error,
          );
          return;
        }

        const senderPublicKey = pubKeyResponse.data?.data?.publicKey;
        if (!senderPublicKey) {
          console.error("No public key in response");
          return;
        }

        // Decrypt using the sender's encrypted version
        let plaintext: string;
        try {
          plaintext = await decryptForSelf(
            p.encryptedForSender.ciphertext,
            keypair,
            senderPublicKey,
          );
        } catch (decryptError) {
          console.warn("Skipping sent message - decryption failed:", p._id);
          return;
        }

        const finalId = p._id;
        const pendingStatus = finalId
          ? pendingStatusRef.current.get(finalId)
          : undefined;
        if (finalId && pendingStatus) {
          pendingStatusRef.current.delete(finalId);
        }

        // Replace temp message with actual message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === p.tempId || m.id === "temp-" + p.tempId
              ? {
                  id: finalId || m.id,
                  text: plaintext,
                  senderType: p.senderType,
                  status: pendingStatus || p.status,
                  createdAt: p.createdAt,
                  isOwnMessage: true,
                  contentType: p.contentType ?? "TEXT",
                }
              : m,
          ),
        );
      } catch (error) {
        console.error("Error processing sent message:", error);
      }
    });

    socketService.on("chat:status", (payload: unknown) => {
      const p = payload as {
        messageId: string;
        status: "SENT" | "DELIVERED" | "READ";
      };
      if (!p?.messageId) return;
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === p.messageId);
        if (!exists) {
          pendingStatusRef.current.set(p.messageId, p.status);
          return prev;
        }
        return prev.map((m) =>
          m.id === p.messageId ? { ...m, status: p.status } : m,
        );
      });
    });

    socketService.on("chat:typing", (payload: unknown) => {
      const p = payload as {
        conversationId?: string;
        from?: { userId: string };
      };
      if (!p?.from?.userId || !selectedContact) return;
      if (p.from.userId !== selectedContact._id) return;
      if (conversationId && p.conversationId !== conversationId) return;
      setTyping(true);
    });

    socketService.on("chat:stop_typing", (payload: unknown) => {
      const p = payload as {
        conversationId?: string;
        from?: { userId: string };
      };
      if (!p?.from?.userId || !selectedContact) return;
      if (p.from.userId !== selectedContact._id) return;
      if (conversationId && p.conversationId !== conversationId) return;
      setTyping(false);
    });

    socketService.on("call:offer", async (payload: unknown) => {
      const p = payload as CallOfferPayload;
      await handleIncomingCall(p);
    });

    socketService.on("call:offer:ack", (payload: unknown) => {
      const p = payload as { callId?: string };
      if (p?.callId) {
        outgoingCallId.current = p.callId;
      }
    });

    socketService.on("call:answer", async (payload: unknown) => {
      const p = payload as CallAnswerPayload;
      if (!peerRef.current) return;
      try {
        await peerRef.current.setRemoteDescription(
          new RTCSessionDescription(p.sdp),
        );
        setCallState("active");
        if (stopRingtone.current) {
          stopRingtone.current();
          stopRingtone.current = null;
        }
        callStartTime.current = new Date();
        callLogSent.current = false;
        isCaller.current = true;
      } catch (error) {
        console.error("Error setting remote description:", error);
        toast.error("Call connection failed");
        endCall();
      }
    });

    socketService.on("call:ice", async (payload: unknown) => {
      const p = payload as CallIcePayload;
      if (!peerRef.current) return;
      if (p?.candidate) {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(p.candidate));
      }
    });

    socketService.on("call:end", async () => {
      endCall();
    });

    socketService.on("call:mute-status", (payload: unknown) => {
      const p = payload as { isMuted: boolean };
      setRemoteMuted(p.isMuted);
      console.log(
        p.isMuted ? "🔇 Remote user muted" : "🔊 Remote user unmuted",
      );
    });

    return () => {
      socketService.off("presence:update");
      socketService.off("chat:message");
      socketService.off("chat:sent");
      socketService.off("chat:status");
      socketService.off("chat:typing");
      socketService.off("chat:stop_typing");
      socketService.off("call:offer");
      socketService.off("call:offer:ack");
      socketService.off("call:answer");
      socketService.off("call:ice");
      socketService.off("call:end");
      socketService.off("call:mute-status");
    };
  }, [conversationId, handleIncomingCall, endCall, selectedContact, admin]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!scrollAreaRef.current) return;
    const scrollContainer = scrollAreaRef.current.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (!scrollContainer) return;

    // Small delay to ensure DOM is updated
    setTimeout(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }, 0);
  }, [messages]);

  const handleSelectContact = async (contact: Contact) => {
    setSelectedContact(contact);
    setMobileView("chat");
    setMessages([]);
    setHasMoreMessages(true);
    setUnreadCounts((prev) => ({ ...prev, [contact._id]: 0 }));

    const result = await chatApi.createConversation(contact._id, "Student");
    const convo = result.data?.data;
    if (convo?._id) {
      setConversationId(convo._id);
      // Load initial messages (first 50)
      await loadMessagesChunk(convo._id);

      const details = await studentApi.getStudentDetails(contact._id);
      const slot = details.data?.data?.slot;
      setSessionDetails({
        slotName: slot?.name || "Morning Session",
        timing: slot?.timeRange
          ? `${slot.timeRange.start} - ${slot.timeRange.end}`
          : "10:00 AM - 11:00 AM",
      });
    }
  };

  const loadMessagesChunk = async (convoId: string, before?: string) => {
    try {
      const keypair = await getOrCreateKeyPair();
      const messagesRes = await chatApi.listMessages(convoId, {
        limit: 50,
        before,
      });

      const messagesList = (messagesRes.data?.data || []) as ChatMessage[];

      if (messagesList.length > 0) {
        const firstMsg = messagesList[0];
        console.log(
          `📥 Admin received ${messagesList.length} messages. First message:`,
          {
            senderId: firstMsg.senderId,
            senderType: firstMsg.senderType,
            encryptedForRecipientLength:
              firstMsg.encryptedForRecipient?.ciphertext?.length,
            encryptedForRecipientCiphertext:
              firstMsg.encryptedForRecipient?.ciphertext?.slice(0, 50) + "...",
            encryptedForSenderLength:
              firstMsg.encryptedForSender?.ciphertext?.length,
          },
        );
      }

      if (messagesList.length < 50) {
        setHasMoreMessages(false);
      }

      const decrypted = await Promise.all(
        messagesList.map(async (m) => {
          try {
            // Check if this message is from current admin
            const isOwnMessage =
              String(m.senderId) === String(admin?._id || "");

            // Use encryptedForSender for own messages, encryptedForRecipient for others
            const payload = isOwnMessage
              ? m.encryptedForSender
              : m.encryptedForRecipient;

            if (!payload?.ciphertext) {
              console.error("No encrypted payload for message", m._id);
              return null;
            }

            // Get sender's public key for decryption
            const pubKeyResponse = await chatApi.getPublicKey(
              m.senderType,
              m.senderId,
            );

            if (pubKeyResponse.error) {
              console.error(
                "Failed to fetch sender public key for message",
                m._id,
              );
              return null;
            }

            const senderPublicKey = pubKeyResponse.data?.data?.publicKey;
            if (!senderPublicKey) {
              console.error("No public key in response for message", m._id);
              return null;
            }

            const text = await decryptForSelf(
              payload.ciphertext,
              keypair,
              senderPublicKey,
            );

            const pendingStatus = pendingStatusRef.current.get(m._id);
            if (pendingStatus) {
              pendingStatusRef.current.delete(m._id);
            }

            return {
              id: m._id,
              text,
              senderType: m.senderType,
              status: pendingStatus || m.status,
              createdAt: m.createdAt,
              isOwnMessage,
              contentType: m.contentType ?? "TEXT",
            } as UiMessage;
          } catch (error) {
            console.error("Error decrypting message:", error);
            return null;
          }
        }),
      );

      const validMessages = decrypted.filter((m) => m !== null).reverse();

      if (before) {
        // Prepend older messages
        setMessages((prev) => [...validMessages, ...prev]);
      } else {
        // Initial load
        setMessages(validMessages);

        if (selectedContact) {
          setUnreadCounts((prev) => ({
            ...prev,
            [selectedContact._id]: 0,
          }));
        }

        // Mark all unread received messages as read
        const unreadMessages = validMessages.filter(
          (m) => !m.isOwnMessage && m.status !== "READ",
        );

        if (unreadMessages.length > 0) {
          console.log(`📖 Marking ${unreadMessages.length} messages as read`);
          unreadMessages.forEach((m) => {
            socketService.emit("chat:read", { messageId: m.id });
          });
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const handleLoadMoreMessages = async () => {
    if (!conversationId || loadingMore || !hasMoreMessages) return;
    setLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      if (oldestMessage?.id) {
        await loadMessagesChunk(conversationId, oldestMessage.id);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSend = async () => {
    if (!selectedContact || !conversationId || !message.trim()) return;
    try {
      const keypair = await getOrCreateKeyPair();
      const messageText = message.trim();
      const tempMessageId = `temp_${Date.now()}`;

      // Add message to UI immediately with PENDING status
      setMessages((prev) => [
        ...prev,
        {
          id: tempMessageId,
          text: messageText,
          senderType: "Admin",
          status: isOnline ? "SENT" : "PENDING",
          createdAt: new Date().toISOString(),
          isOwnMessage: true,
          contentType: "TEXT",
        },
      ]);
      setMessage("");

      // Use cached public key from React Query, or fetch fresh if not available
      let recipientPublicKey = studentPublicKeyData;

      if (!recipientPublicKey) {
        const publicKeyRes = await chatApi.getPublicKey(
          "Student",
          selectedContact._id,
        );
        recipientPublicKey = publicKeyRes.data?.data?.publicKey;

        if (!recipientPublicKey) {
          toast.error(
            "Recipient's public key not available. Please try again.",
          );
          // Remove the temp message if public key fetch fails
          setMessages((prev) => prev.filter((m) => m.id !== tempMessageId));
          setMessage(messageText);
          return;
        }

        // Invalidate and refetch the query to populate cache
        queryClient.invalidateQueries({
          queryKey: ["student-public-key", selectedContact._id],
        });
      }

      const encryptedForRecipient = await encryptForRecipient(
        messageText,
        recipientPublicKey,
      );
      const encryptedForSender = await encryptForRecipient(
        messageText,
        keypair.publicKey,
      );

      socketService.emit("chat:send", {
        conversationId,
        recipientId: selectedContact._id,
        recipientType: "Student",
        encryptedForRecipient: {
          algorithm: "sealed_box",
          ciphertext: encryptedForRecipient,
        },
        encryptedForSender: {
          algorithm: "sealed_box",
          ciphertext: encryptedForSender,
        },
        contentType: "TEXT",
        senderName: "Admin",
      });

      queryClient.invalidateQueries({ queryKey: ["admin-chat-conversations"] });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const startCall = async () => {
    if (!selectedContact) return;

    try {
      setCallState("outgoing");
      callStartTime.current = null;
      callLogSent.current = false;
      outgoingCallId.current = null;
      isCaller.current = true;
      stopRingtone.current = playRingtone(); // Start ringing sound

      const peer = createPeerConnection();
      peerRef.current = peer;

      // Monitor connection state
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed") {
          toast.error("Call connection failed. Please try again.");
          endCall();
        }
      };

      peer.oniceconnectionstatechange = () => {
        // Monitor ICE connection
      };

      const localStream = await getAudioStream();
      localStreamRef.current = localStream;

      // Verify audio track is active
      const audioTrack = localStream.getAudioTracks()[0];
      if (!audioTrack || !audioTrack.enabled) {
        throw new Error("Audio track is not enabled");
      }

      localStream.getTracks().forEach((track: MediaStreamTrack) => {
        peer.addTrack(track, localStream);
      });

      peer.ontrack = (event: RTCTrackEvent) => {
        const remoteAudio = document.getElementById(
          "remote-audio",
        ) as HTMLAudioElement;
        if (remoteAudio && event.streams[0]) {
          setupAudioProcessing(remoteAudio, event.streams[0]);
        }
      };

      peer.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          socketService.emit("call:ice", {
            recipientId: selectedContact._id,
            recipientType: "Student",
            candidate: event.candidate,
          });
        }
      };

      const offer = await peer.createOffer();

      // Optimize SDP for low latency
      const optimizedOffer = {
        ...offer,
        sdp: optimizeSDP(offer.sdp || ""),
      };

      await peer.setLocalDescription(optimizedOffer);

      socketService.emit("call:offer", {
        recipientId: selectedContact._id,
        recipientType: "Student",
        sdp: optimizedOffer,
        conversationId,
      });

      toast.success("Calling...");
    } catch (error) {
      console.error("❌ Start call error:", error);
      toast.error("Failed to start call: " + String(error));
      endCall();
    }
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    if (!selectedContact || !conversationId) return;
    socketService.emit("chat:typing", {
      recipientId: selectedContact._id,
      recipientType: "Student",
      conversationId,
    });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketService.emit("chat:stop_typing", {
        recipientId: selectedContact._id,
        recipientType: "Student",
        conversationId,
      });
    }, 800);
  };

  const renderStatus = (status?: "PENDING" | "SENT" | "DELIVERED" | "READ") => {
    return <StatusIcon status={status} size="sm" />;
  };

  return (
    <>
      {/* Call Panel Overlay */}
      <CallPanel
        callState={callState}
        contactName={
          callState === "incoming"
            ? incomingCallData
              ? (() => {
                  // Try contactMap first
                  const name = contactMap.get(
                    incomingCallData.from.userId,
                  )?.name;
                  return name || "Incoming Call";
                })()
              : "Unknown"
            : selectedContact?.name || "Unknown"
        }
        onAccept={acceptCall}
        onDecline={declineCall}
        onEnd={handleEndCall}
        onToggleMute={toggleMute}
        onToggleSpeaker={toggleSpeaker}
        isMuted={isMuted}
        isSpeakerOn={isSpeakerOn}
        remoteMuted={remoteMuted}
      />

      <div className="h-[calc(100vh-6rem)] grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[300px_1fr_300px] gap-4 p-4">
        <section
          className={`bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden rounded-xl border border-blue-200 flex flex-col ${
            mobileView === "list" ? "block" : "hidden"
          } md:flex`}
        >
          <div className="p-4 border-b border-blue-200 bg-white">
            <div className="flex items-center gap-3">
              <LetterAvatar name={admin?.username || "Admin"} size={44} />
              <div>
                <p className="font-bold text-sm">
                  {admin?.username || "Admin"}
                </p>
                <p className="text-xs text-blue-600 font-medium">Admin</p>
              </div>
            </div>
          </div>

          <div className="p-3 border-b border-blue-200">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 mb-3">
              <Users className="h-4 w-4" /> ONLINE NOW
            </div>
            {onlineFriends.length === 0 ? (
              <div className="text-xs text-blue-700 py-2">
                No students online
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {onlineFriends.map((f) => (
                  <div
                    key={f._id}
                    className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition"
                    onClick={() => handleSelectContact(f)}
                  >
                    <div className="relative">
                      <LetterAvatar name={f.name} size={36} />
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>
                    </div>
                    <span className="text-[10px] text-blue-900 truncate w-full text-center font-medium">
                      {f.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-b border-blue-200">
            <div className="relative">
              <Search className="h-4 w-4 text-blue-600 absolute left-3 top-3.5" />
              <Input
                className="pl-9 border-blue-300 bg-white focus:border-blue-500 rounded-lg"
                placeholder="Search students"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredChats.length === 0 && searchResults.length === 0 ? (
                <div className="text-xs text-blue-700 p-4 text-center">
                  No conversations yet
                </div>
              ) : (
                <>
                  {filteredChats.map((contact) => (
                    <button
                      key={contact._id}
                      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                        selectedContact?._id === contact._id
                          ? "bg-white shadow-md border border-blue-300"
                          : "hover:bg-white/50"
                      }`}
                      onClick={() => handleSelectContact(contact)}
                    >
                      <div className="relative flex-shrink-0">
                        <LetterAvatar name={contact.name} size={40} />
                        {presence[contact._id]?.online && (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">
                          {contact.name}
                        </p>
                        <p className="text-xs text-blue-700 truncate">
                          {presence[contact._id]?.online
                            ? "Online"
                            : presence[contact._id]?.lastSeen
                              ? `Last seen ${new Date(
                                  presence[contact._id]?.lastSeen as string,
                                ).toLocaleTimeString()}`
                              : "Offline"}
                        </p>
                      </div>
                      {unreadCounts[contact._id] > 0 && (
                        <span className="min-w-[22px] h-5 px-1.5 text-[11px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                          {unreadCounts[contact._id]}
                        </span>
                      )}
                    </button>
                  ))}
                  {searchResults.length > 0 && (
                    <>
                      <div className="px-3 pt-2 text-[10px] uppercase font-bold text-blue-900 mt-2">
                        Start new chat
                      </div>
                      {searchResults.map((contact) => (
                        <button
                          key={`new-${contact._id}`}
                          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/50"
                          onClick={() => handleSelectContact(contact)}
                        >
                          <LetterAvatar name={contact.name} size={40} />
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-gray-900">
                              {contact.name}
                            </p>
                            <p className="text-xs text-blue-700">
                              Not started yet
                            </p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </section>

        <section
          className={`bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-xl flex flex-col ${
            mobileView === "chat" ? "flex" : "hidden"
          } md:flex`}
        >
          <div className="p-4 border-b border-gray-200 bg-white rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setMobileView("list")}
              >
                Back
              </Button>
              {selectedContact ? (
                <>
                  <div className="relative">
                    <LetterAvatar name={selectedContact.name} size={44} />
                    {presence[selectedContact._id]?.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">
                        {selectedContact.name}
                      </p>
                    </div>
                    {typing ? (
                      <TypingIndicator name={selectedContact.name} />
                    ) : (
                      <p className="text-xs text-green-600 font-medium">
                        {presence[selectedContact._id]?.online
                          ? "Online"
                          : "Offline"}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  Select a student to start chatting
                </p>
              )}
            </div>
            {selectedContact && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={startCall}
                  title="Start call"
                  className="rounded-full border-blue-200 hover:bg-blue-50"
                >
                  <Phone className="h-4 w-4 text-blue-600" />
                </Button>
                <Sheet open={showDetails} onOpenChange={setShowDetails}>
                  <SheetTrigger
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full lg:hidden hover:bg-gray-100 transition"
                    title="Details"
                  >
                    <Info className="h-5 w-5 text-gray-600" />
                  </SheetTrigger>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px] p-0">
                  <div className="h-full overflow-y-auto p-4">
                    <SheetHeader className="mb-4">
                      <SheetTitle>Session Details</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Slot Information
                        </p>
                        <p className="font-medium">
                          {sessionDetails.slotName || "Not assigned"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Timing</p>
                        <p className="font-medium">
                          {sessionDetails.timing || "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">
                          Notes
                        </p>
                        <textarea
                          className="w-full min-h-[200px] rounded-md border p-2 text-sm"
                          placeholder="Add appointment notes or status..."
                          value={sessionDetails.notes || ""}
                          onChange={(e) =>
                            setSessionDetails((prev) => ({
                              ...prev,
                              notes: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            {/* Removed Phone button duplicate */}
          </div>

          <div className="flex-1 bg-gradient-to-b from-white via-blue-50 to-blue-50 overflow-hidden">
            {!keyReady && (
              <div className="p-6 text-sm text-gray-600 flex items-center justify-center h-full">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  Initializing secure chat...
                </div>
              </div>
            )}
            <ScrollArea
              ref={scrollAreaRef}
              className="h-full"
            >
              <div className="p-4 space-y-4 flex flex-col">
                {hasMoreMessages && messages.length > 0 && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMoreMessages}
                      disabled={loadingMore}
                      className="text-xs bg-white hover:bg-gray-50"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load Earlier Messages"
                      )}
                    </Button>
                  </div>
                )}
                  </div>
                )}

                {messages.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Start a conversation
                    </p>
                  </div>
                )}

                {messages.map((m, idx) => {
                  const prevMsg = idx > 0 ? messages[idx - 1] : null;
                  const isFirstFromSender =
                    !prevMsg || prevMsg.senderType !== m.senderType;
                  const isCall = m.contentType === "CALL";

                  // Check if date changed from previous message
                  const showDateSeparator =
                    !prevMsg ||
                    getMessageDateKey(m.createdAt || new Date()) !==
                      getMessageDateKey(prevMsg.createdAt || new Date());

                  return (
                    <div key={m.id}>
                      {showDateSeparator && (
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-gray-300"></div>
                          <span className="text-xs text-gray-500 px-2">
                            {formatChatDate(m.createdAt || new Date())}
                          </span>
                          <div className="flex-1 h-px bg-gray-300"></div>
                        </div>
                      )}
                      <div
                        className={`flex ${m.senderType === "Admin" ? "justify-end" : "justify-start"}`}
                      >
                        <div className="flex gap-2 max-w-[85%]">
                          {m.senderType === "Student" && isFirstFromSender && (
                            <LetterAvatar
                              name={selectedContact?.name || "Student"}
                              size={28}
                              className="flex-shrink-0 mt-0.5"
                            />
                          )}
                          {m.senderType === "Student" && !isFirstFromSender && (
                            <div className="w-7 flex-shrink-0" />
                          )}

                          <div className="flex flex-col gap-0.5">
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                                isCall
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm"
                                  : m.senderType === "Admin"
                                    ? "bg-blue-500 text-white rounded-br-none shadow-md"
                                    : "bg-white text-gray-900 border border-gray-200 rounded-bl-none shadow-sm"
                              }`}
                            >
                              <span className="inline-flex items-center gap-2">
                                {isCall && (
                                  <Phone className="h-4 w-4 text-emerald-600" />
                                )}
                                <span>{m.text}</span>
                              </span>
                            </div>
                            {m.senderType === "Admin" && !isCall && (
                              <div className="flex items-center justify-end gap-1.5 px-1">
                                <div className="flex items-center gap-0.5">
                                  {renderStatus(m.status)}
                                  {m.createdAt && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatMessageTime(m.createdAt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            {m.senderType === "Student" && !isCall && (
                              <div className="flex items-center justify-start gap-0.5 px-1">
                                <span className="text-[10px] text-muted-foreground">
                                  {m.createdAt &&
                                    formatMessageTime(m.createdAt)}
                                </span>
                              </div>
                            )}
                            {isCall && m.createdAt && (
                              <div
                                className={`flex items-center px-1 ${
                                  m.senderType === "Admin"
                                    ? "justify-end"
                                    : "justify-start"
                                }`}
                              >
                                <span className="text-[10px] text-muted-foreground">
                                  {formatMessageTime(m.createdAt)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
            <div className="flex items-end gap-3">
              <Input
                value={message}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message..."
                className="rounded-full border-gray-300 focus:border-blue-500 bg-gray-50 focus:bg-white transition"
              />
              <Button
                className="rounded-full h-10 w-10 p-0 bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                onClick={handleSend}
                disabled={!message.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <aside className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5 hidden lg:flex flex-col">
          <h3 className="text-sm font-bold text-purple-900 mb-4">Student Details</h3>
          <div className="space-y-4 text-sm flex-1">
            {selectedContact ? (
              <>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <p className="text-purple-700 text-xs font-semibold mb-1">
                    Student Name
                  </p>
                  <p className="font-bold text-gray-900">
                    {selectedContact.name}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <p className="text-purple-700 text-xs font-semibold mb-1">
                    Status
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        presence[selectedContact._id]?.online
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    ></div>
                    <p className="font-medium text-gray-900">
                      {presence[selectedContact._id]?.online
                        ? "Online Now"
                        : "Offline"}
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-200 flex-1">
                  <p className="text-purple-700 text-xs font-semibold mb-2">
                    Session Notes
                  </p>
                  <textarea
                    className="w-full h-[120px] rounded border border-purple-200 p-2 text-xs bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                    placeholder="Add appointment notes or status..."
                    value={sessionDetails.notes || ""}
                    onChange={(e) =>
                      setSessionDetails((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-purple-700">
                <p className="text-sm">Select a student to view details</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
