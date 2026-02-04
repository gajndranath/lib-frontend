import { studentApiCall } from "@/api/studentAxios";
import studentAxios from "@/api/studentAxios";
import type { ApiResponse } from "@/types";
import type {
  EncryptedPayload,
  ChatConversation,
  ChatMessage,
  KeyBackupPayload,
} from "@/api/chat.api";

export interface FriendRequestItem {
  _id: string;
  requesterId?: { _id: string; name: string };
  recipientId?: { _id: string; name: string };
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

export interface FriendListItem {
  _id: string;
  name: string;
  requestId: string;
}

export interface BlockedStudentItem {
  _id: string;
  name: string;
}

export interface FriendRequestsResponse {
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
}

export const studentChatApi = {
  setPublicKey: (publicKey: string) =>
    studentApiCall<ApiResponse<null>>(
      studentAxios.post("/student-chat/keys", { publicKey }),
    ),

  getKeyBackup: () =>
    studentApiCall<ApiResponse<KeyBackupPayload>>(
      studentAxios.get("/student-chat/keys/backup"),
    ),

  setKeyBackup: (payload: KeyBackupPayload) =>
    studentApiCall<ApiResponse<null>>(
      studentAxios.post("/student-chat/keys/backup", payload),
    ),

  getPublicKey: (userType: "Student" | "Admin", userId: string) =>
    studentApiCall<ApiResponse<{ publicKey: string }>>(
      studentAxios.get(`/student-chat/keys/${userType}/${userId}`),
    ),

  listConversations: () =>
    studentApiCall<ApiResponse<ChatConversation[]>>(
      studentAxios.get("/student-chat/conversations"),
    ),

  createConversation: (
    recipientId: string,
    recipientType: "Student" | "Admin",
  ) =>
    studentApiCall<ApiResponse<ChatConversation>>(
      studentAxios.post("/student-chat/conversations", {
        recipientId,
        recipientType,
      }),
    ),

  listMessages: (
    conversationId: string,
    options?: { limit?: number; before?: string },
  ) =>
    studentApiCall<ApiResponse<ChatMessage[]>>(
      studentAxios.get(
        `/student-chat/conversations/${conversationId}/messages`,
        {
          params: { limit: options?.limit ?? 50, before: options?.before },
        },
      ),
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
    studentApiCall<ApiResponse<ChatMessage>>(
      studentAxios.post("/student-chat/messages", payload),
    ),

  listFriends: () =>
    studentApiCall<ApiResponse<FriendListItem[]>>(
      studentAxios.get("/student-chat/friends"),
    ),

  sendFriendRequest: (recipientId: string) =>
    studentApiCall<ApiResponse<FriendRequestItem>>(
      studentAxios.post("/student-chat/friends/request", { recipientId }),
    ),

  listFriendRequests: () =>
    studentApiCall<ApiResponse<FriendRequestsResponse>>(
      studentAxios.get("/student-chat/friends/requests"),
    ),

  respondFriendRequest: (requestId: string, action: "accept" | "reject") =>
    studentApiCall<ApiResponse<FriendRequestItem>>(
      studentAxios.post(`/student-chat/friends/requests/${requestId}/respond`, {
        action,
      }),
    ),

  removeFriend: (friendId: string) =>
    studentApiCall<ApiResponse<null>>(
      studentAxios.post("/student-chat/friends/remove", { friendId }),
    ),

  blockStudent: (blockedId: string) =>
    studentApiCall<ApiResponse<null>>(
      studentAxios.post("/student-chat/friends/block", { blockedId }),
    ),

  unblockStudent: (blockedId: string) =>
    studentApiCall<ApiResponse<null>>(
      studentAxios.post("/student-chat/friends/unblock", { blockedId }),
    ),

  listBlocked: () =>
    studentApiCall<ApiResponse<BlockedStudentItem[]>>(
      studentAxios.get("/student-chat/friends/blocked"),
    ),
};
