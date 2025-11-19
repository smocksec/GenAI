import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Simple memory/file upload config (multer)
const upload = multer({ dest: "uploads/" }); // stores files on disk in uploads/

// Create client with explicit apiKey (prevents ADC lookup)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

/**
 * Helper: send prompt to the model
 * - For testing/dev we pass a text prompt to the model.
 * - caller supplies 'prompt' string
 */
async function callTextModel(prompt, model = "gemini-2.5-pro") {
  const resp = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  // Most SDKs return text on response.text — we mirror your earlier pattern.
  return resp?.text ?? JSON.stringify(resp);
}

/**
 * POST /generate-text
 * Body JSON: { "prompt": "Explain ...", "model": "gemini-2.5-pro" }
 */
app.post("/generate-text", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const model = req.body.model || "gemini-2.5-pro";

    if (!prompt) return res.status(400).json({ error: "Missing 'prompt' in JSON body" });

    const text = await callTextModel(prompt, model);
    res.json({ ok: true, text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /generate-from-image
 * Form-data: field name "image" (file), optional "instruction" (text)
 */
app.post("/generate-from-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Missing file field 'image'" });

    const instruction = req.body.instruction || "Please describe the image in a few words.";
    const filePath = path.resolve(req.file.path);

    // read file as buffer then base64 encode (safe for testing/dev)
    const buf = await fs.readFile(filePath);
    const b64 = buf.toString("base64");
    // clean up uploaded file
    await fs.unlink(filePath).catch(() => {});

    // Build a prompt that includes base64 image (note: large images => big prompt)
    const prompt = `${instruction}\n\nImage (base64):\n${b64}`;

    const text = await callTextModel(prompt, req.body.model || "gemini-2.5-pro");
    res.json({ ok: true, text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /generate-from-document
 * Form-data: field name "document" (file), optional "instruction"
 * Works for PDF/TXT/DOCX etc. Sends content as base64 + instruction to the model.
 */
app.post("/generate-from-document", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Missing file field 'document'" });

    const instruction = req.body.instruction || "Summarize the document and extract important points.";
    const filePath = path.resolve(req.file.path);

    const buf = await fs.readFile(filePath);
    const b64 = buf.toString("base64");
    await fs.unlink(filePath).catch(() => {});

    const prompt = `${instruction}\n\nDocument (base64):\n${b64}`;
    const text = await callTextModel(prompt, req.body.model || "gemini-2.5-pro");
    res.json({ ok: true, text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /generate-from-audio
 * Form-data: field name "audio" (file), optional "instruction"
 * Sends audio as base64 and asks the model to transcribe / summarize as requested.
 */
app.post("/generate-from-audio", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Missing file field 'audio'" });

    const instruction = req.body.instruction || "Please transcribe and summarize this audio file.";
    const filePath = path.resolve(req.file.path);

    const buf = await fs.readFile(filePath);
    const b64 = buf.toString("base64");
    await fs.unlink(filePath).catch(() => {});

    const prompt = `${instruction}\n\nAudio (base64):\n${b64}`;
    const text = await callTextModel(prompt, req.body.model || "gemini-2.5-pro");
    res.json({ ok: true, text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Simple root
app.get("/", (req, res) => {
  res.send("GenAI local test server — POST /generate-text /generate-from-image /generate-from-document /generate-from-audio");
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log("Ensure GEMINI_API_KEY is set in .env");
});
