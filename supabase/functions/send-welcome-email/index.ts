import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, classId } = await req.json();

    if (!userId || !classId) {
      throw new Error("Missing userId or classId");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user details
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      throw new Error(`User not found: ${userError?.message}`);
    }

    // Fetch class details
    const { data: classObj, error: classError } = await supabase
      .from("classes")
      .select("name")
      .eq("id", classId)
      .single();

    if (classError || !classObj) {
      throw new Error(`Class not found: ${classError?.message}`);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
       console.warn("No RESEND_API_KEY environment variable set. Mocking email sending.");
       return new Response(JSON.stringify({ success: true, warning: 'Emails mocked (missing RESEND_API_KEY)' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const resError = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CR Portal <noreply@crportal.app>",
        to: user.email,
        subject: `Welcome to ${classObj.name} on CR Portal!`,
        html: `
          <p>Hello ${user.full_name},</p>
          <p>You have successfully registered and joined <strong>${classObj.name}</strong> on CR Portal.</p>
          <p>You can now log in to the portal to view announcements, submit requests, and stay updated.</p>
          <br />
          <p>Thank you,</p>
          <p>The CR Portal Team</p>
        `
      })
    });

    if (!resError.ok) {
       const errBody = await resError.text();
       throw new Error(`Resend API error: ${errBody}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
