import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";
import { Trash2, Plus, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const courseSchema = z.object({
  courseName: z.string().min(1, "Course name is required"),
  courseCode: z.string().optional(),
  teacherFullName: z.string().min(1, "Teacher name is required"),
  teacherEmail: z.string().email("Valid email required"),
  teacherPhone: z.string().optional(),
});

const classSetupSchema = z.object({
  className: z.string().min(1, "Class name is required"),
  batch: z.string().min(1, "Batch is required"),
  department: z.string().min(1, "Department is required"),
  university: z.string().min(1, "University is required"),
  courses: z.array(courseSchema).min(1, "At least one course is required"),
}).superRefine((data, ctx) => {
  const emails = data.courses.map(c => c.teacherEmail).filter(e => e.length > 0);
  const uniqueEmails = new Set(emails);
  if (uniqueEmails.size !== emails.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Teacher emails must be unique per class setup",
      path: ["courses"],
    });
  }
});

type ClassSetupFormValues = z.infer<typeof classSetupSchema>;

export default function ClassSetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const form = useForm<ClassSetupFormValues>({
    resolver: zodResolver(classSetupSchema),
    defaultValues: {
      className: "",
      batch: "",
      department: "",
      university: "",
      courses: [
        {
          courseName: "",
          courseCode: "",
          teacherFullName: "",
          teacherEmail: "",
          teacherPhone: "",
        },
      ],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    name: "courses",
    control: form.control,
  });

  const setupMutation = useMutation({
    mutationFn: async (data: ClassSetupFormValues) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("Not authenticated");
      const userId = userData.user.id;

      // 1. Insert Class
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .insert({
          name: data.className,
          batch: data.batch,
          department: data.department,
          university: data.university,
          cr_id: userId,
        })
        .select()
        .single();

      if (classError) throw classError;
      const classId = classData.id;

      // 2. Insert Teachers and Courses
      for (const courseItem of data.courses) {
        const consentToken = crypto.randomUUID();

        const { data: teacherData, error: teacherError } = await supabase
          .from("teachers")
          .insert({
            full_name: courseItem.teacherFullName,
            email: courseItem.teacherEmail,
            phone: courseItem.teacherPhone || null,
            class_id: classId,
            consent_status: "pending",
            consent_token: consentToken,
          })
          .select()
          .single();

        if (teacherError) throw teacherError;

        const { error: courseError } = await supabase
          .from("courses")
          .insert({
            class_id: classId,
            teacher_id: teacherData.id,
            course_name: courseItem.courseName,
            course_code: courseItem.courseCode || null,
          });

        if (courseError) throw courseError;

        // 3. Trigger consent email Edge Function for each teacher
        await supabase.functions.invoke("send-consent-email", {
          body: { teacherId: teacherData.id, classId: classId },
        }).catch(err => {
          console.error("Failed to trigger edge function for", teacherData.email, err);
          // Do not fail the entire setup if the email fails to trigger
        });
      }
    },
    onSuccess: () => {
      toast.success("Class setup complete!");
      navigate("/dashboard");
    },
    onError: (error: any) => {
      toast.error("Failed to setup class", {
        description: error.message || "An unexpected error occurred",
      });
    },
  });

  const nextStep = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await form.trigger(["className", "batch", "department", "university"]);
    } else if (step === 2) {
      const pathsToValidate = fields.flatMap((_, idx) => [
        `courses.${idx}.courseName` as const,
        `courses.${idx}.courseCode` as const,
      ]);
      isValid = await form.trigger(pathsToValidate);
      
      if (fields.length === 0) {
        toast.error("You must add at least one course.");
        isValid = false;
      }
    }

    if (isValid) {
      setStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = (data: ClassSetupFormValues) => {
    setupMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-row items-center gap-2 text-sm font-medium">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
        <div className={`h-1 w-12 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
        <div className={`h-1 w-12 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>3</div>
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Class Setup</CardTitle>
          <CardDescription>
            {step === 1 && "Create your new virtual classroom."}
            {step === 2 && "Add courses to your classroom syllabus."}
            {step === 3 && "Assign teachers to your added courses."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* STEP 1: Class Details */}
              <div className={step === 1 ? "block" : "hidden"}>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="className"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="BSSE-6A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="batch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="2022" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Software Engineering" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="university"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>University <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="University Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* STEP 2: Add Courses */}
              <div className={step === 2 ? "block" : "hidden"}>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-start">
                      <FormField
                        control={form.control}
                        name={`courses.${index}.courseName`}
                        render={({ field: inputField }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Course Name <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Intro to Programming" {...inputField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`courses.${index}.courseCode`}
                        render={({ field: inputField }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Course Code</FormLabel>
                            <FormControl>
                              <Input placeholder="CS101" {...inputField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-8 text-destructive self-end sm:self-auto"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => append({ courseName: "", courseCode: "", teacherFullName: "", teacherEmail: "", teacherPhone: "" })}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Course
                  </Button>
                </div>
              </div>

              {/* STEP 3: Add Teachers */}
              <div className={step === 3 ? "block" : "hidden"}>
                <div className="space-y-6">
                  {form.formState.errors.courses?.root?.message && (
                     <div className="text-sm font-medium text-destructive">
                       {form.formState.errors.courses.root.message}
                     </div>
                  )}
                  {fields.map((field, index) => {
                    const courseName = form.watch(`courses.${index}.courseName`) || `Course ${index + 1}`;
                    return (
                      <div key={field.id} className="space-y-4 rounded-lg border p-4">
                        <div className="text-lg font-semibold border-b pb-2 mb-4">{courseName}</div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`courses.${index}.teacherFullName`}
                            render={({ field: inputField }) => (
                              <FormItem>
                                <FormLabel>Teacher Name <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                  <Input placeholder="Dr. John Doe" {...inputField} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`courses.${index}.teacherEmail`}
                            render={({ field: inputField }) => (
                              <FormItem>
                                <FormLabel>Teacher Email <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="john.doe@university.edu" {...inputField} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`courses.${index}.teacherPhone`}
                            render={({ field: inputField }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Teacher Phone <span className="text-muted-foreground">(Optional for WhatsApp)</span></FormLabel>
                                <FormControl>
                                  <Input placeholder="+1234567890" {...inputField} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={step === 1 || setupMutation.isPending}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          
          {step < totalSteps ? (
            <Button type="button" onClick={nextStep}>
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              type="button" 
              onClick={form.handleSubmit(onSubmit)} 
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Setup
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
