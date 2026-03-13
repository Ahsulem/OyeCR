import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

type ClassDetails = {
  id: string;
  name: string;
  batch: string | null;
  department: string | null;
};

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    rollNumber: z
      .string()
      .min(4, "Roll number must be at least 4 characters")
      .regex(/^[A-Z0-9-]+$/, "Roll number should contain uppercase letters, numbers, or dashes"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function StudentJoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();

  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [isLoadingClass, setIsLoadingClass] = useState(true);
  const [classError, setClassError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchClass = async () => {
      if (!inviteCode) {
        setClassError("No invite code provided");
        setIsLoadingClass(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("classes")
          .select("id, name, batch, department")
          .eq("invite_code", inviteCode)
          .single();

        if (error || !data) {
          setClassError("Invalid or expired invite link");
        } else {
          setClassDetails(data);
        }
      } catch (err) {
        setClassError("Invalid or expired invite link");
      } finally {
        setIsLoadingClass(false);
      }
    };

    fetchClass();
  }, [inviteCode]);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      rollNumber: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    if (!classDetails) return;
    setIsSubmitting(true);

    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            roll_number: data.rollNumber,
            role: "student",
          },
        },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("user already registered")) {
          throw new Error("Email already has an account — please log in with your existing account instead.");
        }
        throw authError;
      }

      if (!authData.user) throw new Error("Failed to create user account");

      const userId = authData.user.id;

      // 2. We wait slightly for the database trigger `handle_new_user` to finish creating the public.users row
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Insert into class_members
      const { error: memberError } = await supabase
        .from("class_members")
        .insert({
          class_id: classDetails.id,
          student_id: userId,
        });

      if (memberError) {
        if (memberError.code === '23505') { // Unique violation
            throw new Error("You are already a member of this class or the roll number is already registered.");
        }
        throw memberError;
      }

      // 4. Trigger Welcome Email Edge Function
      await supabase.functions.invoke("send-welcome-email", {
          body: { userId: userId, classId: classDetails.id },
      }).catch(err => {
          console.error("Failed to trigger welcome email edge function", err);
      });

      toast.success("Registration successful", {
        description: `You have successfully joined ${classDetails.name}`,
      });

      // 5. Navigate to portal (auth session is active)
      navigate("/portal");

    } catch (error: any) {
      toast.error("Registration failed", {
        description: error.message || "An unexpected error occurred during registration.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingClass) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (classError || !classDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-destructive">Error</CardTitle>
            <CardDescription className="text-lg">{classError}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
             <Button asChild variant="outline">
               <Link to="/login">Return to Login</Link>
             </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Class Details Banner */}
      <Card className="w-full max-w-md mb-8 border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold text-primary">{classDetails.name}</CardTitle>
          <CardDescription className="text-base text-foreground/80 mt-2">
            You are invited to join this class portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-4 text-sm font-medium text-muted-foreground pb-6">
          {classDetails.department && <span>{classDetails.department}</span>}
          {classDetails.batch && <span>• Batch {classDetails.batch}</span>}
        </CardContent>
      </Card>

      {/* Registration Form */}
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle>Student Registration</CardTitle>
          <CardDescription>
            Create your account to access the class materials and announcements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rollNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roll Number <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="FA20-BSE-001" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        disabled={isSubmitting} 
                      />
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
                    <FormLabel>Email Address <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@university.edu" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Join Class"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4 pb-6 mt-2">
          <div className="text-sm text-muted-foreground">
            Already have an account? Log in and use the invite link to join the class. <br/>
            <Link to="/login" className="text-primary hover:underline font-medium text-center block mt-2">
              Go to Login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
