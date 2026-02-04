import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studentChatApi } from "@/api/studentChat.api";
import { studentAuthApi } from "@/api/studentAuth.api";
import { socketService } from "@/api/socket.service";
import {
  initCrypto,
  getOrCreateKeyPair,
  buildKeyStorageKey,
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
import { useStudentAuthStore } from "@/store/studentAuth.store";
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
import { Phone, Search, Send, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import type {
  BlockedStudentItem,
  FriendListItem,
  FriendRequestsResponse,
} from "@/api/studentChat.api";

interface Contact {
  _id: string;
  name: string;
  userType: "Student" | "Admin";
}

interface UiMessage {
  id: string;
  text: string;
  senderType: "Student" | "Admin";
  status?: "PENDING" | "SENT" | "DELIVERED" | "READ";
  createdAt?: string;
  isOwnMessage?: boolean;
  contentType?: "TEXT" | "CALL";
}

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

export default function StudentChat() {
  const queryClient = useQueryClient();
  const { student } = useStudentAuthStore();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [typing, setTyping] = useState(false);
  const [presence, setPresence] = useState<
    Record<string, { online: boolean; lastSeen?: string | null }>
  >({});
  const [mobileView, setMobileView] = useState<"list" | "chat" | "details">(
    "list",
  );
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
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const stopRingtone = useRef<(() => void) | null>(null);
  const callStartTime = useRef<Date | null>(null);
  const callLogSent = useRef(false);
  const outgoingCallId = useRef<string | null>(null);
  const isCaller = useRef(false);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const pendingStatusRef = useRef<Map<string, "SENT" | "DELIVERED" | "READ">>(
    new Map(),
  );
  const keyStorageKey = useMemo(
    () =>
      buildKeyStorageKey({
        userType: "Student",
        userId: student?._id || null,
      }),
    [student?._id],
  );

  const { data: studentsData } = useQuery({
    queryKey: ["chat-students"],
    queryFn: async () => {
      const { data } = await studentAuthApi.listChatStudents();
      return data?.data || [];
    },
  });

  const {
    data: adminsData,
    isLoading: adminsLoading,
    error: adminsError,
    status: adminsStatus,
  } = useQuery({
    queryKey: ["chat-admins"],
    queryFn: async () => {
      try {
        const result = await studentAuthApi.listChatAdmins();

        if (result.error) {
          console.error("Failed to fetch admins:", result.error);
          throw new Error(result.error.message || "Failed to fetch admins");
        }

        const adminsArray = result.data?.data;

        if (!Array.isArray(adminsArray)) {
          console.warn("Admins response is not an array");
          return [];
        }

        return adminsArray;
      } catch (error) {
        console.error("Error fetching admins:", error);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

  const { data: conversationsData } = useQuery({
    queryKey: ["student-chat-conversations"],
    queryFn: async () => {
      const { data } = await studentChatApi.listConversations();
      return data?.data || [];
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const { data: friendRequestsData } = useQuery({
    queryKey: ["student-friend-requests"],
    queryFn: async () => {
      const { data } = await studentChatApi.listFriendRequests();
      return data?.data as FriendRequestsResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

  const { data: friendsData } = useQuery({
    queryKey: ["student-friends"],
    queryFn: async () => {
      const { data } = await studentChatApi.listFriends();
      return data?.data as FriendListItem[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

  const { data: blockedData } = useQuery({
    queryKey: ["student-blocked"],
    queryFn: async () => {
      try {
        const { data } = await studentChatApi.listBlocked();
        return (data?.data as BlockedStudentItem[]) || [];
      } catch (error) {
        console.error("Failed to fetch blocked list:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

  const students = useMemo<Contact[]>(() => {
    if (!Array.isArray(studentsData)) return [];
    return studentsData.map((s: { _id: string; name: string }) => ({
      _id: s._id,
      name: s.name,
      userType: "Student",
    }));
  }, [studentsData]);

  const admins = useMemo<Contact[]>(() => {
    if (!adminsData || !Array.isArray(adminsData)) {
      return [];
    }
    return adminsData.map((a: { _id: string; username: string }) => ({
      _id: a._id,
      name: a.username,
      userType: "Admin" as const,
    }));
  }, [adminsData]);

  const contactMap = useMemo(() => {
    const map = new Map<string, Contact>();
    students.forEach((s) => map.set(s._id, s));
    admins.forEach((a) => map.set(a._id, a));
    return map;
  }, [students, admins]);

  const blockedIds = useMemo(
    () => new Set((blockedData || []).map((b) => b._id)),
    [blockedData],
  );

  useEffect(() => {
    if (!Array.isArray(conversationsData)) return;
    const next: Record<string, number> = {};
    conversationsData.forEach(
      (c: {
        _id: string;
        participants: Array<{ userId: string; userType: string }>;
        unreadCount?: number;
      }) => {
        const other = c.participants.find(
          (p) => String(p.userId) !== String(student?._id || ""),
        );
        if (!other) return;
        next[other.userId] = c.unreadCount || 0;
      },
    );
    setUnreadCounts(next);
  }, [conversationsData, student]);

  const chatList = useMemo<Contact[]>(() => {
    // Start with all admins (automatically available to all students)
    const contacts = [...admins];
    const addedIds = new Set(admins.map((a) => a._id));

    // Add friends (students with accepted friend requests)
    if (Array.isArray(friendsData)) {
      friendsData.forEach((friend: { _id: string; name: string }) => {
        // Skip if it's the current student or already added
        if (friend._id === student?._id || addedIds.has(friend._id)) return;
        if (blockedIds.has(friend._id)) return;

        contacts.push({
          _id: friend._id,
          name: friend.name,
          userType: "Student" as const,
        });
        addedIds.add(friend._id);
      });
    }

    // Add existing conversations (in case there are conversations with non-friends)
    if (Array.isArray(conversationsData)) {
      conversationsData.forEach(
        (c: { participants: Array<{ userId: string; userType: string }> }) => {
          const other = c.participants.find((p) => p.userId !== student?._id);
          if (!other) return;

          if (other.userType === "Student" && blockedIds.has(other.userId)) {
            return;
          }

          // Skip if already added
          if (addedIds.has(other.userId)) return;

          const contact = contactMap.get(other.userId) || {
            _id: other.userId,
            name: "Unknown",
            userType: other.userType as "Student" | "Admin",
          };
          contacts.push(contact);
          addedIds.add(other.userId);
        },
      );
    }

    return contacts;
  }, [conversationsData, contactMap, student, admins, friendsData, blockedIds]);

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chatList;
    return chatList.filter((c) => c.name.toLowerCase().includes(q));
  }, [chatList, search]);

  const onlineFriends = useMemo(() => {
    const friends = (Array.isArray(friendsData) ? friendsData : [])
      .filter((f) => f._id !== student?._id) // Exclude self
      .filter((f) => !blockedIds.has(f._id))
      .map((f) => ({
        ...f,
        userType: "Student" as const,
      }));
    // Include both admins and friends who are online
    const allContacts = [...admins, ...friends];
    return allContacts.filter((f) => presence[f._id]?.online);
  }, [friendsData, presence, admins, student, blockedIds]);

  const incomingRequests = friendRequestsData?.incoming || [];
  const outgoingRequests = friendRequestsData?.outgoing || [];

  const friendSearchResults = useMemo(() => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return [];
    const existingFriendIds = new Set((friendsData || []).map((f) => f._id));
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) &&
        s._id !== student?._id &&
        !existingFriendIds.has(s._id) &&
        !blockedIds.has(s._id),
    );
  }, [friendSearch, students, friendsData, student, blockedIds]);

  useEffect(() => {
    if (adminsError) {
      console.error("Failed to fetch admins:", adminsError);
    }
  }, [adminsError]);

  useEffect(() => {
    if (!student?._id) return;
    const setup = async () => {
      await initCrypto();
      const keypair = await getOrCreateKeyPair(keyStorageKey);
      await studentChatApi.setPublicKey(keypair.publicKey);
    };
    setup();
  }, [student?._id, keyStorageKey]);

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
        ? { id: selectedContact._id, type: selectedContact.userType }
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
        const keypair = await getOrCreateKeyPair(keyStorageKey);
        const publicKeyRes = await studentChatApi.getPublicKey(
          recipient.type,
          recipient.id,
        );
        const recipientPublicKey = publicKeyRes.data?.data?.publicKey;

        if (!recipientPublicKey) return;

        const encryptedForRecipient = await encryptForRecipient(
          callText,
          recipientPublicKey,
          keypair,
        );
        const encryptedForSender = await encryptForRecipient(
          callText,
          keypair.publicKey,
          keypair,
        );

        const tempMessageId = `call_${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: tempMessageId,
            text: callText,
            senderType: "Student",
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
          senderPublicKey: keypair.publicKey,
          contentType: "CALL",
          senderName: "Student",
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
      // Stop notification sound when accepting
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
      toast.error("Failed to accept call: " + String(error));
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
        recipientType: selectedContact.userType,
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

        // Broadcast mute status to remote user
        const recipient = selectedContact
          ? { id: selectedContact._id, type: selectedContact.userType }
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
        recipientType: selectedContact.userType,
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

      // Message object has encryptedForRecipient and encryptedForSender
      if (!p?.encryptedForRecipient?.ciphertext) return;

      const isCurrentConversation =
        !conversationId || p.conversationId === conversationId;

      if (!isCurrentConversation) {
        // Always mark as delivered when message is received
        if (p._id) {
          socketService.emit("chat:delivered", { messageId: p._id });
        }
        // Increment unread count for sender
        if (p.senderId) {
          setUnreadCounts((prev) => ({
            ...prev,
            [p.senderId]: (prev[p.senderId] || 0) + 1,
          }));
        }
        return;
      }

      try {
        const keypair = await getOrCreateKeyPair(keyStorageKey);

        let senderPublicKey = p.senderPublicKey;
        if (!senderPublicKey) {
          const pubKeyResponse = await studentChatApi.getPublicKey(
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

          senderPublicKey = pubKeyResponse.data?.data?.publicKey;
          if (!senderPublicKey) {
            console.error("No public key in response");
            return;
          }
        }

        // Decrypt using the recipient's encrypted version
        let plaintext: string;
        try {
          plaintext = await decryptForSelf(
            p.encryptedForRecipient.ciphertext,
            keypair,
            senderPublicKey,
          );
        } catch (_decryptError) {
          // Skip messages that can't be decrypted (wrong sender key or incompatible format)
          return;
        }

        // Check if sender is current student
        const isOwnMessage = String(p.senderId) === String(student?._id || "");

        const messageId = p._id || crypto.randomUUID();
        const pendingStatus = pendingStatusRef.current.get(messageId);
        if (pendingStatus) {
          pendingStatusRef.current.delete(messageId);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: messageId,
            text: plaintext,
            senderType: p.senderType,
            status: pendingStatus || p.status || "SENT",
            createdAt: p.createdAt
              ? new Date(p.createdAt).toISOString()
              : undefined,
            isOwnMessage,
            contentType: p.contentType || "TEXT",
          },
        ]);

        // Always mark as delivered when message is received
        if (p._id) {
          socketService.emit("chat:delivered", { messageId: p._id });

          // Mark as read immediately if viewing this conversation
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
      } catch (_error) {
        // Error decrypting incoming message
      }
    });

    socketService.on("chat:sent", async (payload: unknown) => {
      const p = payload as ChatSocketPayload;
      if (!p?.encryptedForSender?.ciphertext) return;
      if (conversationId && p.conversationId !== conversationId) return;

      try {
        const keypair = await getOrCreateKeyPair(keyStorageKey);

        let senderPublicKey = p.senderPublicKey;
        if (!senderPublicKey) {
          senderPublicKey = keypair.publicKey;
        }

        // Decrypt using the sender's encrypted version (for own messages)
        let plaintext: string;
        try {
          plaintext = await decryptForSelf(
            p.encryptedForSender.ciphertext,
            keypair,
            senderPublicKey,
          );
        } catch (_decryptError) {
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

        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((m) =>
            m.id === p.tempId || m.id === "temp-" + p.tempId
              ? {
                  id: finalId || m.id,
                  text: plaintext,
                  senderType: p.senderType,
                  status: pendingStatus || p.status || "SENT",
                  createdAt: p.createdAt
                    ? new Date(p.createdAt).toISOString()
                    : undefined,
                  isOwnMessage: true,
                  contentType: p.contentType || "TEXT",
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
    });

    // ✅ Listen for new friend requests
    socketService.on("friend-request:new", (_payload: unknown) => {
      // Refresh friend requests list
      queryClient.invalidateQueries({
        queryKey: ["student-friend-requests"],
      });
      toast.info("You have a new friend request!");
    });

    // ✅ Listen for friend request responses
    socketService.on("friend-request:accepted", (_payload: unknown) => {
      // Refresh friends and conversations list
      queryClient.invalidateQueries({ queryKey: ["student-friends"] });
      queryClient.invalidateQueries({
        queryKey: ["student-chat-conversations"],
      });
      toast.success("Friend request accepted!");
    });

    socketService.on("friend:removed", (payload: unknown) => {
      console.log("❌ Friend removed:", payload);
      queryClient.invalidateQueries({ queryKey: ["student-friends"] });
      queryClient.invalidateQueries({
        queryKey: ["student-chat-conversations"],
      });
      if (
        selectedContact &&
        selectedContact._id === (payload as { removedBy?: string }).removedBy
      ) {
        setSelectedContact(null);
        setConversationId(null);
        setMessages([]);
      }
    });

    socketService.on("friend:blocked", (payload: unknown) => {
      console.log("🚫 Blocked:", payload);
      queryClient.invalidateQueries({ queryKey: ["student-friends"] });
      queryClient.invalidateQueries({ queryKey: ["student-blocked"] });
      queryClient.invalidateQueries({
        queryKey: ["student-chat-conversations"],
      });
      if (
        selectedContact &&
        selectedContact._id === (payload as { blockedBy?: string }).blockedBy
      ) {
        setSelectedContact(null);
        setConversationId(null);
        setMessages([]);
      }
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
      socketService.off("friend-request:new");
      socketService.off("friend-request:accepted");
      socketService.off("friend:removed");
      socketService.off("friend:blocked");
    };
  }, [
    conversationId,
    handleIncomingCall,
    endCall,
    selectedContact,
    queryClient,
    student,
  ]);

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

    try {
      const result = await studentChatApi.createConversation(
        contact._id,
        contact.userType,
      );
      const convo = result.data?.data;
      if (convo?._id) {
        setConversationId(convo._id);
        // Load initial messages (first 50)
        await loadMessagesChunk(convo._id);
      }
    } catch (error: unknown) {
      console.error("Error selecting contact:", error);
      const errorMessage =
        (
          error as {
            response?: { data?: { message?: string } };
            message?: string;
          }
        )?.response?.data?.message ||
        (error as { message?: string })?.message ||
        "Failed to start conversation";
      toast.error(errorMessage);
    }
  };

  const loadMessagesChunk = async (convoId: string, before?: string) => {
    try {
      const keypair = await getOrCreateKeyPair(keyStorageKey);
      const messagesRes = await studentChatApi.listMessages(convoId, {
        limit: 50,
        before,
      });

      const messagesList = (messagesRes.data?.data ||
        []) as unknown as ChatMessage[];

      if (messagesList.length > 0) {
        const firstMsg = messagesList[0];
        console.log(
          `📥 Student received ${messagesList.length} messages. First message:`,
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
            // Check if this message is from the current student
            const isOwnMessage =
              String(m.senderId) === String(student?._id || "");

            // Use encryptedForSender for own messages, encryptedForRecipient for others
            const payload = isOwnMessage
              ? m.encryptedForSender
              : m.encryptedForRecipient;

            if (!payload?.ciphertext) {
              console.error("No encrypted payload for message", m._id);
              return null;
            }

            let senderPublicKey = m.senderPublicKey;
            if (!senderPublicKey) {
              if (isOwnMessage) {
                senderPublicKey = keypair.publicKey;
              } else {
                const pubKeyResponse = await studentChatApi.getPublicKey(
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

                senderPublicKey = pubKeyResponse.data?.data?.publicKey;
                if (!senderPublicKey) {
                  console.error("No public key in response for message", m._id);
                  return null;
                }
              }
            }

            let text: string;
            try {
              text = await decryptForSelf(
                payload.ciphertext,
                keypair,
                senderPublicKey,
              );
            } catch (_decryptError) {
              return {
                id: m._id,
                text: "Unable to decrypt message",
                senderType: m.senderType,
                status: m.status,
                createdAt: m.createdAt
                  ? new Date(m.createdAt).toISOString()
                  : undefined,
                isOwnMessage,
                contentType: m.contentType ?? "TEXT",
              };
            }

            const pendingStatus = pendingStatusRef.current.get(m._id);
            if (pendingStatus) {
              pendingStatusRef.current.delete(m._id);
            }

            return {
              id: m._id,
              text,
              senderType: m.senderType,
              status: pendingStatus || m.status,
              createdAt: m.createdAt
                ? new Date(m.createdAt).toISOString()
                : undefined,
              isOwnMessage,
              contentType: m.contentType ?? "TEXT",
            };
          } catch (error) {
            console.error("Error decrypting message:", error);
            return {
              id: m._id,
              text: "Unable to decrypt message",
              senderType: m.senderType,
              status: m.status,
              createdAt: m.createdAt
                ? new Date(m.createdAt).toISOString()
                : undefined,
              isOwnMessage: String(m.senderId) === String(student?._id || ""),
              contentType: m.contentType ?? "TEXT",
            };
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
      if (oldestMessage?.createdAt) {
        await loadMessagesChunk(conversationId, oldestMessage.createdAt);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSend = async () => {
    if (!selectedContact || !conversationId || !message.trim()) return;

    if (!socketService.isConnected()) {
      toast.error("Socket not connected. Please refresh the page.");
      return;
    }

    const messageText = message.trim();
    const tempId = `temp_${Date.now()}`;
    const initialStatus = isOnline ? "SENT" : "PENDING";

    // Add temporary message to UI immediately
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        text: messageText,
        senderType: "Student",
        createdAt: new Date().toISOString(),
        status: initialStatus,
        isOwnMessage: true,
        contentType: "TEXT",
      },
    ]);

    setMessage("");

    try {
      const keypair = await getOrCreateKeyPair(keyStorageKey);

      // Always fetch fresh recipient key to avoid stale cache
      const publicKeyRes = await studentChatApi.getPublicKey(
        selectedContact.userType,
        selectedContact._id,
      );

      if (publicKeyRes.error) {
        console.error(
          "Failed to fetch recipient public key:",
          publicKeyRes.error,
        );
        toast.error("Failed to fetch recipient public key");
        // Remove temp message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setMessage(messageText);
        return;
      }

      const recipientPublicKey = publicKeyRes.data?.data?.publicKey;
      if (!recipientPublicKey) {
        console.error("No recipient public key found");
        toast.error("Recipient's public key not available. Please try again.");
        // Remove temp message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setMessage(messageText);
        return;
      }

      const encryptedForRecipient = await encryptForRecipient(
        messageText,
        recipientPublicKey,
        keypair,
      );
      const encryptedForSender = await encryptForRecipient(
        messageText,
        keypair.publicKey,
        keypair,
      );

      console.log(`🔐 Encrypted message for Admin (${selectedContact._id}):`, {
        messageText,
        recipientPublicKey: recipientPublicKey?.slice(0, 20) + "...",
        senderPrivateKey: keypair.privateKey?.slice(0, 20) + "...",
        encryptedForRecipient: encryptedForRecipient.slice(0, 30) + "...",
      });

      const socketPayload = {
        conversationId,
        recipientId: selectedContact._id,
        recipientType: selectedContact.userType,
        encryptedForRecipient: {
          algorithm: "sealed_box",
          ciphertext: encryptedForRecipient,
        },
        encryptedForSender: {
          algorithm: "sealed_box",
          ciphertext: encryptedForSender,
        },
        senderPublicKey: keypair.publicKey,
        contentType: "TEXT",
        senderName: "Student",
        tempId,
      };

      socketService.emit("chat:send", socketPayload);

      console.log("Message sent successfully");
      queryClient.invalidateQueries({
        queryKey: ["student-chat-conversations"],
      });
    } catch (error) {
      console.error("Error in handleSend:", error);
      toast.error("Failed to send message: " + String(error));
      // Remove temp message on error and restore input
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessage(messageText);
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

      // Play ringing tone
      stopRingtone.current = playRingtone();

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
            recipientType: selectedContact.userType,
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
        recipientType: selectedContact.userType,
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
      recipientType: selectedContact.userType,
      conversationId,
    });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketService.emit("chat:stop_typing", {
        recipientId: selectedContact._id,
        recipientType: selectedContact.userType,
        conversationId,
      });
    }, 800);
  };

  const handleSendFriendRequest = async (recipientId: string) => {
    try {
      await studentChatApi.sendFriendRequest(recipientId);
      toast.success("Friend request sent");
      queryClient.invalidateQueries({ queryKey: ["student-friend-requests"] });
    } catch (error) {
      console.error(error);
      toast.error("Could not send request");
    }
  };

  const handleRespondRequest = async (
    requestId: string,
    action: "accept" | "reject",
  ) => {
    try {
      await studentChatApi.respondFriendRequest(requestId, action);
      toast.success(action === "accept" ? "Friend added" : "Request rejected");
      queryClient.invalidateQueries({ queryKey: ["student-friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["student-friends"] });
      queryClient.invalidateQueries({
        queryKey: ["student-chat-conversations"],
      });
    } catch (error) {
      console.error(error);
      toast.error("Request update failed");
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await studentChatApi.removeFriend(friendId);
      toast.success("Friend removed");
      queryClient.invalidateQueries({ queryKey: ["student-friends"] });
      queryClient.invalidateQueries({
        queryKey: ["student-chat-conversations"],
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove friend");
    }
  };

  const handleBlockStudent = async (blockedId: string) => {
    try {
      await studentChatApi.blockStudent(blockedId);
      toast.success("Student blocked");
      queryClient.invalidateQueries({ queryKey: ["student-friends"] });
      queryClient.invalidateQueries({ queryKey: ["student-blocked"] });
      queryClient.invalidateQueries({
        queryKey: ["student-chat-conversations"],
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to block student");
    }
  };

  const handleUnblockStudent = async (blockedId: string) => {
    try {
      await studentChatApi.unblockStudent(blockedId);
      toast.success("Student unblocked");
      queryClient.invalidateQueries({ queryKey: ["student-blocked"] });
    } catch (error) {
      console.error(error);
      toast.error("Failed to unblock student");
    }
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
                  // Try contactMap first (includes friends and searched students)
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

      {/* Modern Chat Container */}
      <div className="h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50 flex flex-col pb-2 md:pb-0">
        {/* Main Chat Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[340px_1fr_320px] gap-0 md:gap-4 md:p-4 p-0 overflow-hidden">
          {/* Left Sidebar - Conversations List */}
          <section
            className={cn(
              "bg-white md:rounded-xl md:shadow-lg md:border overflow-hidden flex flex-col rounded-none",
              mobileView === "list" ? "flex" : "hidden md:flex",
            )}
          >
            {/* User Profile Header */}
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <LetterAvatar name={student?.name || "Student"} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">
                    {student?.name || "Student"}
                  </p>
                  <p className="text-xs text-blue-600 font-medium">
                    Student Portal
                  </p>
                </div>
              </div>
            </div>

            {/* Online Friends */}
            {onlineFriends.length > 0 && (
              <div className="p-3 border-b bg-green-50/50">
                <div className="flex items-center gap-2 text-xs font-semibold text-green-700 mb-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  Online ({onlineFriends.length})
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {onlineFriends.map((f) => (
                    <button
                      key={f._id}
                      className="flex flex-col items-center gap-1 min-w-fit hover:opacity-75 transition"
                      onClick={() =>
                        handleSelectContact({
                          _id: f._id,
                          name: f.name,
                          userType: f.userType,
                        })
                      }
                    >
                      <div className="relative">
                        <LetterAvatar name={f.name} size={40} />
                        <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></span>
                      </div>
                      <span className="text-[10px] text-gray-600 truncate w-14 text-center font-medium">
                        {f.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition"
                  placeholder="Search conversations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Friend Requests Banner */}
            {incomingRequests.length > 0 && (
              <div className="p-3 border-b bg-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <p className="text-sm font-semibold text-blue-700">
                      {incomingRequests.length} Friend Request
                      {incomingRequests.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-blue-600 hover:text-blue-700 lg:hidden"
                    onClick={() => setShowDetails(true)}
                  >
                    View
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="h-[calc(100vh-26rem)]">
              <div className="p-2 space-y-1">
                {filteredChats.map((contact) => (
                  <button
                    key={contact._id}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                      selectedContact?._id === contact._id
                        ? "bg-blue-50"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => handleSelectContact(contact)}
                  >
                    <LetterAvatar name={contact.name} size={40} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">
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
                      <span className="min-w-[20px] h-5 px-1.5 text-[11px] font-semibold bg-blue-500 text-white rounded-full flex items-center justify-center">
                        {unreadCounts[contact._id]}
                      </span>
                    )}
                  </button>
                ))}
                {filteredChats.length === 0 && (
                  <div className="text-xs text-muted-foreground p-3 space-y-1">
                    {adminsLoading ? (
                      <div>Loading contacts... (loading)</div>
                    ) : adminsError ? (
                      <div>Error loading admins: {String(adminsError)}</div>
                    ) : adminsStatus === "success" &&
                      adminsData?.length === 0 ? (
                      <div>No chats yet. Add a friend to start.</div>
                    ) : (
                      <div>Status: {adminsStatus}</div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </section>

          <section
            className={`bg-white shadow-sm flex-col rounded-none md:rounded-xl md:border overflow-hidden ${
              mobileView === "chat" ? "flex" : "hidden"
            } md:flex`}
          >
            <div className="p-3 md:p-4 border-b flex items-center justify-between gap-2">
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
                    <LetterAvatar name={selectedContact.name} size={40} />
                    <div>
                      <p className="font-semibold">{selectedContact.name}</p>
                      {typing ? (
                        <TypingIndicator name={selectedContact.name} />
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {presence[selectedContact._id]?.online
                            ? "Online"
                            : "Offline"}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a chat to start
                  </p>
                )}
              </div>
              {selectedContact && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={startCall}
                    title="Call"
                  >
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Sheet open={showDetails} onOpenChange={setShowDetails}>
                    <SheetTrigger
                      className="relative inline-flex h-10 w-10 items-center justify-center rounded-md lg:hidden hover:bg-accent"
                      title="Details"
                    >
                      <Info className="h-5 w-5" />
                      {/* ✅ Badge for pending friend requests */}
                      {incomingRequests.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                          {incomingRequests.length}
                        </span>
                      )}
                    </SheetTrigger>
                    <SheetContent
                      side="right"
                      className="w-[320px] p-0 bg-white"
                    >
                      <div className="h-full overflow-y-auto p-4">
                        <SheetHeader className="mb-4">
                          <SheetTitle>Details & Friends</SheetTitle>
                        </SheetHeader>
                        <h3 className="text-sm font-semibold mb-4">
                          Session Details
                        </h3>
                        <div className="space-y-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">
                              Slot Information
                            </p>
                            <p className="font-medium">
                              {student?.slotId
                                ? "Your Slot"
                                : "Morning Session"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">
                              Timing
                            </p>
                            <p className="font-medium">10:00 AM - 11:00 AM</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">
                              Details
                            </p>
                            <textarea
                              className="w-full min-h-[120px] rounded-md border p-2 text-sm"
                              placeholder="Add appointment notes or status..."
                            />
                          </div>
                        </div>

                        <div className="mt-6">
                          <h4 className="text-sm font-semibold mb-2">
                            Friend Requests
                          </h4>
                          <div className="space-y-2">
                            {incomingRequests.length === 0 && (
                              <p className="text-xs text-muted-foreground">
                                No requests
                              </p>
                            )}
                            {incomingRequests.map((req) => (
                              <div
                                key={req._id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span>
                                  {req.requesterId?.name || "Student"}
                                </span>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleRespondRequest(req._id, "accept")
                                    }
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleRespondRequest(req._id, "reject")
                                    }
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4">
                            <h4 className="text-sm font-semibold mb-2">
                              Add Friend
                            </h4>
                            <div className="relative mb-2">
                              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                              <Input
                                className="pl-9"
                                placeholder="Search students"
                                value={friendSearch}
                                onChange={(e) =>
                                  setFriendSearch(e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              {friendSearchResults.map((s) => (
                                <div
                                  key={s._id}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span>{s.name}</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleSendFriendRequest(s._id)
                                    }
                                  >
                                    Add
                                  </Button>
                                </div>
                              ))}
                              {friendSearch &&
                                friendSearchResults.length === 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    No matches
                                  </p>
                                )}
                            </div>
                            {outgoingRequests.length > 0 && (
                              <div className="mt-3 text-xs text-muted-foreground">
                                Pending requests: {outgoingRequests.length}
                              </div>
                            )}
                          </div>

                          <div className="mt-6">
                            <h4 className="text-sm font-semibold mb-2">
                              Friends
                            </h4>
                            <div className="space-y-2">
                              {(friendsData || []).length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                  No friends yet
                                </p>
                              )}
                              {(friendsData || []).map((f) => (
                                <div
                                  key={f._id}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span>{f.name}</span>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRemoveFriend(f._id)}
                                    >
                                      Remove
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleBlockStudent(f._id)}
                                    >
                                      Block
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-6">
                            <h4 className="text-sm font-semibold mb-2">
                              Blocked
                            </h4>
                            <div className="space-y-2">
                              {(blockedData || []).length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                  No blocked
                                </p>
                              )}
                              {(blockedData || []).map((b) => (
                                <div
                                  key={b._id}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span>{b.name}</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUnblockStudent(b._id)}
                                  >
                                    Unblock
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              )}
            </div>

            <div className="flex-1 bg-gradient-to-b from-blue-50 to-blue-25 overflow-hidden">
              <ScrollArea ref={scrollAreaRef} className="h-full w-full">
                <div className="space-y-3 min-h-full flex flex-col px-3 md:px-4 py-2">
                  {hasMoreMessages && messages.length > 0 && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMoreMessages}
                        disabled={loadingMore}
                        className="text-xs"
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

                  {messages.length === 0 && (
                    <div className="flex-1 flex items-center justify-center min-h-[300px]">
                      <p className="text-sm text-muted-foreground">
                        Start a conversation
                      </p>
                    </div>
                  )}

                  {messages.map((m, idx) => {
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const isFirstFromSender =
                      !prevMsg || prevMsg.isOwnMessage !== m.isOwnMessage;
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
                          className={`flex ${m.isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div className="flex gap-2 max-w-[85%]">
                            {!m.isOwnMessage && isFirstFromSender && (
                              <LetterAvatar
                                name={selectedContact?.name || "Student"}
                                size={28}
                                className="flex-shrink-0 mt-0.5"
                              />
                            )}
                            {!m.isOwnMessage && !isFirstFromSender && (
                              <div className="w-7 flex-shrink-0" />
                            )}

                            <div className="flex flex-col gap-1">
                              <div
                                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                                  isCall
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm"
                                    : m.isOwnMessage
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
                              {m.isOwnMessage && !isCall && (
                                <div className="flex items-center justify-end gap-0.5 px-1">
                                  <span className="text-[10px] text-muted-foreground">
                                    {m.createdAt &&
                                      formatMessageTime(m.createdAt)}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {renderStatus(m.status)}
                                  </div>
                                </div>
                              )}
                              {!m.isOwnMessage && !isCall && (
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
                                    m.isOwnMessage
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

            <div className="p-3 md:p-4 border-t bg-white shadow-lg">
              <div className="flex items-center gap-2">
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
                  className="rounded-full border-gray-300 focus:border-blue-500"
                />
                <Button
                  className="rounded-full h-10 w-10 p-0 bg-blue-500 hover:bg-blue-600"
                  onClick={handleSend}
                  disabled={!message.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>

          <aside className="border rounded-xl bg-white shadow-sm p-4 hidden lg:block">
            <h3 className="text-sm font-semibold mb-4">Session Details</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">
                  Slot Information
                </p>
                <p className="font-medium">
                  {student?.slotId ? "Your Slot" : "Morning Session"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Timing</p>
                <p className="font-medium">10:00 AM - 11:00 AM</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Details</p>
                <textarea
                  className="w-full min-h-[120px] rounded-md border p-2 text-sm"
                  placeholder="Add appointment notes or status..."
                />
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-2">Friend Requests</h4>
              <div className="space-y-2">
                {incomingRequests.length === 0 && (
                  <p className="text-xs text-muted-foreground">No requests</p>
                )}
                {incomingRequests.map((req) => (
                  <div
                    key={req._id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{req.requesterId?.name || "Student"}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRespondRequest(req._id, "accept")}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRespondRequest(req._id, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Add Friend</h4>
                <div className="relative mb-2">
                  <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    className="pl-9"
                    placeholder="Search students"
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  {friendSearchResults.map((s) => (
                    <div
                      key={s._id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{s.name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendFriendRequest(s._id)}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                  {friendSearch && friendSearchResults.length === 0 && (
                    <p className="text-xs text-muted-foreground">No matches</p>
                  )}
                </div>
                {outgoingRequests.length > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Pending requests: {outgoingRequests.length}
                  </div>
                )}
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-2">Friends</h4>
                <div className="space-y-2">
                  {(friendsData || []).length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No friends yet
                    </p>
                  )}
                  {(friendsData || []).map((f) => (
                    <div
                      key={f._id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{f.name}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveFriend(f._id)}
                        >
                          Remove
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleBlockStudent(f._id)}
                        >
                          Block
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-2">Blocked</h4>
                <div className="space-y-2">
                  {(blockedData || []).length === 0 && (
                    <p className="text-xs text-muted-foreground">No blocked</p>
                  )}
                  {(blockedData || []).map((b) => (
                    <div
                      key={b._id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{b.name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnblockStudent(b._id)}
                      >
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
