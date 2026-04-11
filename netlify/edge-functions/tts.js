export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { text, voice = "onyx", speed = 1 } = await request.json();

  if (!text || text.trim().length === 0) {
    return Response.json({ error: "No text provided" }, { status: 400 });
  }

  if (text.length > 4096) {
    return Response.json({ error: "Chunk too long. Max 4096 chars." }, { status: 400 });
  }

  const apiKey = Deno.env.get("OPENAI_KEY");

  if (!apiKey) {
    return Response.json({ error: "OPENAI_KEY not configured" }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice,
        speed: parseFloat(speed),
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return Response.json({ error: `OpenAI error: ${err}` }, { status: response.status });
    }

    return new Response(response.body, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config = { path: "/api/tts" };
