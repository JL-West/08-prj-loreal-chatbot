// Copy this code into your Cloudflare Worker script

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const apiKey = env.OPENAI_API_KEY; //
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "https://loreal-chatbot-worker.jaammiiee99.workers.dev/",
        }),
        { status: 500, headers: corsHeaders }
      );
    }
    const apiUrl = "";
    const userInput = await request.json();

    const requestBody = {
      model: "gpt-4o",
      messages: userInput.messages,
      max_completion_tokens: 300,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // If OpenAI returns a non-OK status, include the body in the returned error for easier debugging
    if (!response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({
          error: "OpenAI API error",
          status: response.status,
          details: text,
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { headers: corsHeaders });
  },
};