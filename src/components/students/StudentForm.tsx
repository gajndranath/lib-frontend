import React from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useCreateStudent } from "@/hooks/useStudents";
import { toast } from "sonner";

// Define a schema that works with string inputs but transforms to numbers
const studentFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name too long"),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, { message: "Phone number must be 10 digits" }),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  monthlyFees: z
    .string()
    .min(1, "Monthly fees is required")
    .refine((val) => !isNaN(Number(val)), "Must be a number")
    .refine((val) => Number(val) >= 1, "Must be at least ₹1"),
  joiningDate: z.string().optional(),
  billingDay: z
    .string()
    .refine((val) => !isNaN(Number(val)), "Must be a number")
    .refine((val) => {
      const num = Number(val);
      return num >= 1 && num <= 31;
    }, "Must be between 1 and 31"),
  address: z.string().optional(),
});

// Define the transformed data type that matches your API
type StudentFormInputs = z.infer<typeof studentFormSchema>;
type StudentFormData = Omit<StudentFormInputs, "monthlyFees" | "billingDay"> & {
  monthlyFees: number;
  billingDay: number;
};

interface StudentFormProps {
  onSuccess?: () => void;
  initialData?: Partial<StudentFormData>;
}

export const StudentForm: React.FC<StudentFormProps> = ({
  onSuccess,
  initialData,
}) => {
  const createStudent = useCreateStudent();

  const form = useForm<StudentFormInputs>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      monthlyFees: "1000",
      joiningDate: format(new Date(), "yyyy-MM-dd"),
      billingDay: new Date().getDate().toString(),
      address: "",
      ...(initialData
        ? {
            ...initialData,
            monthlyFees: initialData.monthlyFees?.toString() || "1000",
            billingDay:
              initialData.billingDay?.toString() ||
              new Date().getDate().toString(),
          }
        : {}),
    },
  });

  const onSubmit: SubmitHandler<StudentFormInputs> = async (inputData) => {
    try {
      // Transform string inputs to numbers for the API
      const apiData: StudentFormData = {
        ...inputData,
        monthlyFees: Number(inputData.monthlyFees),
        billingDay: Number(inputData.billingDay),
        email: inputData.email || undefined,
        address: inputData.address || undefined,
      };

      await createStudent.mutateAsync(apiData);

      form.reset();
      toast.success("Student added successfully");
      onSuccess?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      console.error("Error adding student:", errorMessage);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number *</FormLabel>
                <FormControl>
                  <Input placeholder="9876543210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    placeholder="john@example.com"
                    type="email"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="monthlyFees"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Fees (₹) *</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} value={field.value} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="joiningDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Joining Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="billingDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Day (1-31)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    {...field}
                    value={field.value}
                  />
                </FormControl>
                <FormDescription>
                  Day of month when invoice will be generated
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="Street, City, State, PIN"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            className="border"
            onClick={() => onSuccess?.()}
            disabled={createStudent.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createStudent.isPending}>
            {createStudent.isPending ? "Adding..." : "Add Student"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
