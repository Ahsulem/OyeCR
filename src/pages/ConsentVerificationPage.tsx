import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ConsentVerificationPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token provided.");
      return;
    }

    const verifyConsent = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-consent", {
          body: { token },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setStatus("success");
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message || "Failed to verify consent. Token may be invalid or expired.");
      }
    };

    verifyConsent();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Consent Verification</CardTitle>
          {status === "loading" && <CardDescription>Verifying your secure token...</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          {status === "loading" && (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
              <p className="text-lg font-medium">Thank you — your consent has been recorded.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                You will now receive student request emails directly from this class portal.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="mb-4 h-16 w-16 text-destructive" />
              <p className="text-lg font-medium text-destructive">Verification Failed</p>
              <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
           <Button variant="outline" onClick={() => window.location.href = '/'}>
              Return to Home
           </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
