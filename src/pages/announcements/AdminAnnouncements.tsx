import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { announcementsApi } from "@/api/announcements.api";
import { studentApi } from "@/api/students.api";
import { slotApi } from "@/api/slot.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AdminAnnouncements() {
  const [scope, setScope] = useState<
    "ALL_STUDENTS" | "SLOT" | "SPECIFIC_STUDENTS"
  >("ALL_STUDENTS");
  const [slotId, setSlotId] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: studentsData } = useQuery({
    queryKey: ["announcement-students"],
    queryFn: async () => {
      const { data } = await studentApi.searchStudents({
        status: "ACTIVE",
        limit: 1000,
      });
      return data?.data?.students || [];
    },
  });

  const { data: slotsData } = useQuery({
    queryKey: ["announcement-slots"],
    queryFn: async () => {
      const { data } = await slotApi.listSlots({ limit: 1000 });
      return data?.data?.slots || [];
    },
  });

  const students = useMemo(() => {
    if (!Array.isArray(studentsData)) return [];
    return studentsData.map((s: { _id: string; name: string }) => ({
      _id: s._id,
      name: s.name,
    }));
  }, [studentsData]);

  const slots = useMemo(() => {
    if (!Array.isArray(slotsData)) return [];
    return slotsData.map((s: { _id: string; slotOption: string }) => ({
      _id: s._id,
      slotOption: s.slotOption,
    }));
  }, [slotsData]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleSend = async () => {
    if (!title || !body) {
      toast.error("Title and body are required");
      return;
    }

    const recipientsRes = await announcementsApi.resolveRecipients({
      targetScope: scope,
      slotId: scope === "SLOT" ? slotId : undefined,
      recipientIds:
        scope === "SPECIFIC_STUDENTS" ? selectedStudents : undefined,
    });

    const recipients = recipientsRes.data?.data || [];
    if (recipients.length === 0) {
      toast.error("No recipients found");
      return;
    }

    // Announcements are now plain text, no encryption needed
    await announcementsApi.createAnnouncement({
      targetScope: scope,
      slotId: scope === "SLOT" ? slotId : undefined,
      recipientIds:
        scope === "SPECIFIC_STUDENTS" ? selectedStudents : undefined,
      title,
      body,
    });

    setTitle("");
    setBody("");
    setSlotId("");
    toast.success("Announcement sent");
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Scope</label>
            <Select
              value={scope}
              onValueChange={(
                v: "ALL_STUDENTS" | "SLOT" | "SPECIFIC_STUDENTS",
              ) => setScope(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="ALL_STUDENTS">All Students</SelectItem>
                <SelectItem value="SLOT">Slot</SelectItem>
                <SelectItem value="SPECIFIC_STUDENTS">
                  Specific Students
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === "SLOT" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Slot Option</label>
              <Select value={slotId} onValueChange={setSlotId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a slot" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {slots.map((slot) => (
                    <SelectItem key={slot._id} value={slot._id}>
                      {slot.slotOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === "SPECIFIC_STUDENTS" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Students</label>
              <div className="max-h-48 overflow-auto border rounded p-2 space-y-1">
                {students.map((s) => (
                  <label
                    key={s._id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s._id)}
                      onChange={() => toggleStudent(s._id)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
            />
          </div>

          <Button onClick={handleSend}>Send Announcement</Button>
        </CardContent>
      </Card>
    </div>
  );
}
