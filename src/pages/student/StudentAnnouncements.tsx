import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentAnnouncementsApi } from "@/api/studentAnnouncements.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Announcement } from "@/types";

interface DisplayAnnouncement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export default function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState<DisplayAnnouncement[]>([]);

  const { data } = useQuery({
    queryKey: ["student-announcements"],
    queryFn: async () => {
      const result = await studentAnnouncementsApi.listAnnouncements();
      return result.data?.data || [];
    },
  });

  useEffect(() => {
    if (data) {
      const list = (data || []) as unknown as Announcement[];
      // Announcements are now plain text, no decryption needed
      const announcementsList = list.map((a: any) => ({
        id: a._id,
        title: a.title,
        body: a.body,
        createdAt: a.createdAt,
      }));
      setAnnouncements(announcementsList);
    }
  }, [data]);

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {announcements.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No announcements yet.
                </p>
              )}
              {announcements.map((a) => (
                <Card key={a.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{a.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
