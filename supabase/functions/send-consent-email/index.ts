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
    const { teacherId } = await req.json();

    if (!teacherId) {
      throw new Error("Missing teacherId");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch teacher record along with class name and CR user details
    const { data: teacher, error: fetchError } = await supabase
      .from("teachers")
      .select(`
        id,
        full_name,
        email,
        consent_token,
        classes (
          id,
          name,
          cr_id,
          users ( full_name )
        )
      `)
      .eq("id", teacherId)
      .single();

    if (fetchError || !teacher) {
      throw new Error(`Teacher not found: ${fetchError?.message}`);
    }

    // Generate consent token
    const consentToken = crypto.randomUUID();

    // Update teacher record with token
    const { error: updateError } = await supabase
      .from("teachers")
      .update({ consent_token: consentToken })
      .eq("id", teacherId);

    if (updateError) {
      throw updateError;
    }

    const className = teacher.classes?.name || "Unknown Class";
    const crName = teacher.classes?.users?.full_name || "A Class Representative";
    
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";
    const consentLink = `${appUrl}/consent/${consentToken}`;

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
       console.warn("No RESEND_API_KEY environment variable set. Not sending an actual email over network.");
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
        to: teacher.email,
        subject: "CR Portal — Course Link Consent Request",
        html: `
          <p>Hello ${teacher.full_name},</p>
          <p><strong>${crName}</strong> wants to link your email to the <strong>${className}</strong> portal.</p>
          <p>Please click the button below to verify your consent. You will then receive student requests directly for this class via the portal.</p>
          <a href="${consentLink}" style="display:inline-block;padding:10px 20px;background-color:#4F46E5;color:#ffffff;text-decoration:none;border-radius:5px;">Verify Consent</a>
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
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
