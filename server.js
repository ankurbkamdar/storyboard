import { readFileSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import cors from "cors";

// Load .env manually since dotenv v17 changed behavior
const envFile = readFileSync(".env", "utf-8");
for (const line of envFile.split("\n")) {
  const match = line.match(/^(\w+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim();
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const client = new Anthropic();

app.post("/api/parse-script", async (req, res) => {
  const { script } = req.body;
  if (!script?.trim()) {
    return res.status(400).json({ error: "No script provided" });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are a professional storyboard artist and cinematographer. Analyze this screenplay and break it into individual scenes. For each scene, provide cinematography suggestions.

Return ONLY valid JSON — no markdown, no code fences, no explanation. The response must be a JSON array:

[
  {
    "sceneNumber": 1,
    "slugline": "INT. LOCATION - TIME",
    "description": "Brief scene description",
    "characters": ["CHARACTER1", "CHARACTER2"],
    "suggestedShot": "Wide",
    "suggestedAngle": "Eye Level",
    "suggestedMovement": "Static"
  }
]

Valid shot types: Wide, Medium, Close-Up, Extreme Close-Up, POV, Over-the-Shoulder
Valid angles: Eye Level, Low Angle, High Angle, Dutch Angle, Bird's Eye, Worm's Eye
Valid movements: Static, Pan, Tilt, Dolly, Handheld, Drone

Here is the screenplay:

${script}`,
        },
      ],
    });

    const text = message.content[0].text;
    const scenes = JSON.parse(text);
    res.json(scenes);
  } catch (err) {
    console.error("API error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/generate-frame", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt?.trim()) {
    return res.status(400).json({ error: "No prompt provided" });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token || token === "your-replicate-token-here") {
    return res.status(500).json({ error: "REPLICATE_API_TOKEN not set in .env" });
  }

  try {
    // Start prediction
    const createRes = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Prefer": "wait",
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: "16:9",
          output_format: "webp",
          output_quality: 80,
          num_inference_steps: 4,
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.detail || "Replicate API error");
    }

    const prediction = await createRes.json();

    // Poll until complete (Prefer: wait may still need polling in some cases)
    let result = prediction;
    const maxWait = 60;
    let waited = 0;
    while (result.status !== "succeeded" && result.status !== "failed" && waited < maxWait) {
      await new Promise((r) => setTimeout(r, 1000));
      waited++;
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      result = await pollRes.json();
    }

    if (result.status === "failed") {
      throw new Error(result.error || "Image generation failed");
    }

    const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    res.json({ imageUrl });
  } catch (err) {
    console.error("Replicate error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
