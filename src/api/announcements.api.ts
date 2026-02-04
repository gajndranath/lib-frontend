import { apiCall } from "@/api/axios";
import axiosInstance from "@/api/axios";
import type { ApiResponse } from "@/types";

export interface RecipientCiphertext {
  recipientId: string;
  algorithm: "sealed_box";
  titleCiphertext: string;
  bodyCiphertext: string;
}

export interface Announcement {
  _id: string;
  createdBy: string;
  targetScope: "ALL_STUDENTS" | "SLOT" | "SPECIFIC_STUDENTS";
  slotId?: string;
  recipientIds: string[];
  recipientCiphertexts: RecipientCiphertext[];
  createdAt: string;
}

export const announcementsApi = {
  resolveRecipients: (payload: {
    targetScope: "ALL_STUDENTS" | "SLOT" | "SPECIFIC_STUDENTS";
    slotId?: string;
    recipientIds?: string[];
  }) =>
    apiCall<ApiResponse<Array<{ _id: string }>>>(
      axiosInstance.post("/announcements/recipients", payload),
    ),

  createAnnouncement: (payload: {
    targetScope: "ALL_STUDENTS" | "SLOT" | "SPECIFIC_STUDENTS";
    slotId?: string;
    recipientIds?: string[];
    title: string;
    body: string;
    recipientCiphertexts?: RecipientCiphertext[];
  }) =>
    apiCall<ApiResponse<Announcement>>(
      axiosInstance.post("/announcements", payload),
    ),
};
