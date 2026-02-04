import { apiCall } from "@/api/axios";
import axiosInstance from "@/api/axios";
import type { ApiResponse } from "@/types";

export interface EncryptedPayload {
  algorithm: "sealed_box";
  ciphertext: string;
}

export interface ChatConversation {
  _id: string;
  participants: Array<{ userId: string; userType: "Student" | "Admin" }>;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  senderType: "Student" | "Admin";
  recipientId: string;
  recipientType: "Student" | "Admin";
  contentType: "TEXT" | "CALL";
  encryptedForRecipient: EncryptedPayload;
  encryptedForSender: EncryptedPayload;
  senderPublicKey?: string;
  status: "SENT" | "DELIVERED" | "READ";
  createdAt: string;
}

export const chatApi = {
  setPublicKey: (publicKey: string) =>
    apiCall<ApiResponse<null>>(axiosInstance.post("/chat/keys", { publicKey })),

  getPublicKey: (userType: "Student" | "Admin", userId: string) =>
    apiCall<ApiResponse<{ publicKey: string }>>(
      axiosInstance.get(`/chat/keys/${userType}/${userId}`),
    ),

  listConversations: () =>
    apiCall<ApiResponse<ChatConversation[]>>(
      axiosInstance.get("/chat/conversations"),
    ),

  createConversation: (
    recipientId: string,
    recipientType: "Student" | "Admin",
  ) =>
    apiCall<ApiResponse<ChatConversation>>(
      axiosInstance.post("/chat/conversations", { recipientId, recipientType }),
    ),

  listMessages: (
    conversationId: string,
    options?: { limit?: number; before?: string },
  ) =>
    apiCall<ApiResponse<ChatMessage[]>>(
      axiosInstance.get(`/chat/conversations/${conversationId}/messages`, {
        params: { limit: options?.limit ?? 50, before: options?.before },
      }),
    ),

  sendMessage: (payload: {
    conversationId: string;
    recipientId: string;
    recipientType: "Student" | "Admin";
    encryptedForRecipient: EncryptedPayload;
    encryptedForSender: EncryptedPayload;
    senderPublicKey?: string;
    contentType?: "TEXT" | "CALL";
  }) =>
    apiCall<ApiResponse<ChatMessage>>(
      axiosInstance.post("/chat/messages", payload),
    ),
};
