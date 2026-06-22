var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var aiClient = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required for AI actions");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasKey: !!process.env.GEMINI_API_KEY
  });
});
app.post("/api/refine-iac", async (req, res) => {
  try {
    const { code, tool, provider, prompt } = req.body;
    if (!code || !tool) {
      return res.status(400).json({ error: "Missing required parameters: code, tool." });
    }
    const ai = getAiClient();
    const systemInstruction = `Voc\xEA \xE9 um Engenheiro de Software S\xEAnior, Especialista de Cloud e SRE de n\xEDvel mundial.
Especializado em Infraestrutura como C\xF3digo (Terraform e AWS CloudFormation).
Seu objetivo \xE9 analisar, otimizar, explicar ou refinar o c\xF3digo IaC enviado pelo usu\xE1rio de acordo com as instru\xE7\xF5es dele.

Regras estritas:
1. Retorne APENAS o c\xF3digo de infraestrutura ajustado se solicitado, ou uma resposta explicativa clara com trechos de c\xF3digo formatados em Markdown.
2. Siga as melhores pr\xE1ticas da plataforma de destino (${provider ? provider.toUpperCase() : "Nuvem"}).
3. Sempre inclua coment\xE1rios de melhores pr\xE1ticas de seguran\xE7a (ex: portas restritas no Security Group, criptografia ativada, bloqueio de acesso p\xFAblico).`;
    const userMessage = `C\xF3digo original (${tool}):
\`\`\`${tool === "terraform" ? "hcl" : "yaml"}
${code}
\`\`\`

Instru\xE7\xF5es do usu\xE1rio: ${prompt || "Forne\xE7a uma an\xE1lise de seguran\xE7a e optimize este c\xF3digo se necess\xE1rio."}`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.2
      }
    });
    const refinedText = response.text || "Nenhuma resposta recebida da IA.";
    res.json({ result: refinedText });
  } catch (error) {
    console.error("Error with Gemini refinement service:", error);
    res.status(500).json({
      error: error.message || "Erro inesperado no servi\xE7o de IA da Google."
    });
  }
});
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[IaC Generator Server] Running on http://0.0.0.0:${PORT}`);
  });
}
setupVite().catch((error) => {
  console.error("Failed to start server:", error);
});
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
