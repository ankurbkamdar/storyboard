export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body || {};
  if (!prompt?.trim()) {
    return res.status(400).json({ error: "No prompt provided" });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "REPLICATE_API_TOKEN not set" });
  }

  try {
    const createRes = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait",
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
      }
    );

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.detail || "Replicate API error");
    }

    const prediction = await createRes.json();

    let result = prediction;
    const maxWait = 60;
    let waited = 0;
    while (result.status !== "succeeded" && result.status !== "failed" && waited < maxWait) {
      await new Promise((r) => setTimeout(r, 1000));
      waited++;
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      result = await pollRes.json();
    }

    if (result.status === "failed") {
      throw new Error(result.error || "Image generation failed");
    }

    const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    res.json({ imageUrl });
  } catch (err) {
    console.error("generate-frame error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
