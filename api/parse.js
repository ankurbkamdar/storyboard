import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { script } = req.body || {};
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
    "characterDescriptions": {
      "CHARACTER1": "40s, tall woman with red hair, wearing a trench coat",
      "CHARACTER2": "20s, nervous young man in a suit"
    },
    "suggestedShot": "Wide",
    "suggestedAngle": "Eye Level",
    "suggestedMovement": "Static"
  }
]

For characterDescriptions: always include every character from the "characters" array as a key. Extract their physical appearance (age, build, hair, clothing, notable features) from the screenplay. If no appearance details exist in the script, write a brief generic description based on their role/name. Keep each value concise (under 15 words).

Valid shot types: Wide, Medium, Close-Up, Extreme Close-Up, POV, Over-the-Shoulder
Valid angles: Eye Level, Low Angle, High Angle, Dutch Angle, Bird's Eye, Worm's Eye
Valid movements: Static, Pan, Tilt, Dolly, Handheld, Drone

Here is the screenplay:

${script}`,
        },
      ],
    });

    const scenes = JSON.parse(message.content[0].text);
    res.json(scenes);
  } catch (err) {
    console.error("parse error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
