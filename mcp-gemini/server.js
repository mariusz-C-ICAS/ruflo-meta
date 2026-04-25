#!/usr/bin/env node
/**
 * Gemini MCP Server
 *
 * Exposes Google Gemini as tools callable by Claude Code (PCBiuro orchestrator).
 * Runs as a stdio MCP server — registered in .claude/settings.json.
 *
 * Required env var: GEMINI_API_KEY
 * Optional:         GEMINI_MODEL (default: gemini-2.0-flash)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";


const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("[mcp-gemini] GEMINI_API_KEY env var is required");
  process.exit(1);
}

const MODEL_ID = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const genai = new GoogleGenerativeAI(API_KEY);

const server = new McpServer({
  name: "gemini",
  version: "1.0.0",
});

// ── Tool: gemini_generate ─────────────────────────────────────────────────────

server.tool(
  "gemini_generate",
  "Send a prompt to Gemini and get a text response. Use for drafting, brainstorming, summarisation, or any task where a second model opinion is valuable.",
  {
    prompt: z.string().describe("The prompt to send to Gemini"),
    system: z
      .string()
      .optional()
      .describe("Optional system instruction (sets Gemini's role/persona)"),
    model: z
      .string()
      .optional()
      .describe(
        "Override model ID (e.g. gemini-2.0-pro). Defaults to GEMINI_MODEL env var."
      ),
    temperature: z
      .number()
      .min(0)
      .max(2)
      .optional()
      .describe("Sampling temperature 0-2 (default 1.0)"),
  },
  async ({ prompt, system, model, temperature }) => {
    const modelId = model ?? MODEL_ID;
    const geminiModel = genai.getGenerativeModel({
      model: modelId,
      ...(system ? { systemInstruction: system } : {}),
      generationConfig: {
        ...(temperature !== undefined ? { temperature } : {}),
      },
    });

    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();

    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
    };
  }
);

// ── Tool: gemini_analyze_code ─────────────────────────────────────────────────

server.tool(
  "gemini_analyze_code",
  "Ask Gemini to review or analyse a code snippet. Returns structured feedback: summary, issues, suggestions.",
  {
    code: z.string().describe("The code to analyse"),
    language: z
      .string()
      .optional()
      .describe("Programming language hint (e.g. typescript, python)"),
    focus: z
      .enum(["review", "security", "performance", "refactor", "explain"])
      .optional()
      .default("review")
      .describe("What aspect to focus on"),
  },
  async ({ code, language, focus }) => {
    const langHint = language ? `Language: ${language}\n` : "";
    const focusPrompts = {
      review:
        "Perform a thorough code review. List bugs, anti-patterns, and improvements.",
      security:
        "Perform a security audit. Find vulnerabilities (OWASP Top 10, injection, auth issues).",
      performance:
        "Analyse performance. Identify bottlenecks, O(n) issues, unnecessary allocations.",
      refactor:
        "Suggest refactoring. Improve readability, reduce complexity, propose better patterns.",
      explain: "Explain what this code does, step by step, in plain language.",
    };

    const prompt = `${langHint}${focusPrompts[focus ?? "review"]}\n\n\`\`\`\n${code}\n\`\`\``;

    const geminiModel = genai.getGenerativeModel({
      model: MODEL_ID,
      systemInstruction:
        "You are an expert software engineer. Be concise and specific. Format with Markdown.",
    });

    const result = await geminiModel.generateContent(prompt);
    return {
      content: [{ type: "text", text: result.response.text() }],
    };
  }
);

// ── Tool: gemini_compare ──────────────────────────────────────────────────────

server.tool(
  "gemini_compare",
  "Ask Gemini to compare two options, approaches, or text snippets and recommend the better one.",
  {
    option_a: z.string().describe("First option or approach"),
    option_b: z.string().describe("Second option or approach"),
    context: z
      .string()
      .optional()
      .describe("Background context to help Gemini decide"),
  },
  async ({ option_a, option_b, context }) => {
    const contextBlock = context ? `Context: ${context}\n\n` : "";
    const prompt = `${contextBlock}Compare these two options and recommend the better one with clear reasoning.\n\n**Option A:**\n${option_a}\n\n**Option B:**\n${option_b}`;

    const geminiModel = genai.getGenerativeModel({ model: MODEL_ID });
    const result = await geminiModel.generateContent(prompt);
    return {
      content: [{ type: "text", text: result.response.text() }],
    };
  }
);

// ── Tool: gemini_translate ────────────────────────────────────────────────────

server.tool(
  "gemini_translate",
  "Translate text to a target language using Gemini.",
  {
    text: z.string().describe("Text to translate"),
    target_language: z
      .string()
      .describe("Target language (e.g. English, Polish, German)"),
    preserve_formatting: z
      .boolean()
      .optional()
      .default(true)
      .describe("Keep Markdown/HTML formatting intact"),
  },
  async ({ text, target_language, preserve_formatting }) => {
    const formatHint = preserve_formatting
      ? " Preserve all Markdown/HTML formatting exactly."
      : "";
    const prompt = `Translate the following text to ${target_language}.${formatHint} Return only the translated text, no explanations.\n\n${text}`;

    const geminiModel = genai.getGenerativeModel({ model: MODEL_ID });
    const result = await geminiModel.generateContent(prompt);
    return {
      content: [{ type: "text", text: result.response.text() }],
    };
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[mcp-gemini] running (model: ${MODEL_ID})`);
