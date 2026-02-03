import { useEffect, useState } from "react";
import { studentAnnouncementsApi } from "@/api/studentAnnouncements.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Announcement } from "@/types";

interface DisplayAnnouncement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export default function StudentAnnouncementsDecrypt() {
  const [announcements, setAnnouncements] = useState<DisplayAnnouncement[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await studentAnnouncementsApi.listAnnouncements();
      const list = (res.data?.data || []) as unknown as Announcement[];

      // Announcements are now plain text, no decryption needed
      const announcementsList = list.map((a: any) => ({
        id: a._id,
        title: a.title,
        body: a.body,
        createdAt: a.createdAt,
      }));

      setAnnouncements(announcementsList);
    };

    load();
  }, []);

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {announcements.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No announcements yet.
            </p>
          )}
          {announcements.map((a) => (
            <div key={a.id} className="border rounded p-3">
              <div className="text-sm text-muted-foreground">
                {new Date(a.createdAt).toLocaleString()}
              </div>
              <div className="font-semibold mt-1">{a.title}</div>
              <div className="text-sm mt-2">{a.body}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
