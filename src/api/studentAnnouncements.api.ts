import { studentApiCall } from "@/api/studentAxios";
import studentAxios from "@/api/studentAxios";
import type { ApiResponse } from "@/types";
import type { Announcement } from "@/api/announcements.api";

export const studentAnnouncementsApi = {
  listAnnouncements: (limit = 50) =>
    studentApiCall<ApiResponse<Announcement[]>>(
      studentAxios.get("/student-announcements", { params: { limit } }),
    ),
};
