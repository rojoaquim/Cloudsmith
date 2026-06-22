/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy initialize Gemini AI client to avoid crash on startup when key is missing
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required for AI actions');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasKey: !!process.env.GEMINI_API_KEY,
  });
});

// Endpoint for refining resources, explaining or adding security checks to IaC with Gemini
app.post('/api/refine-iac', async (req, res) => {
  try {
    const { code, tool, provider, prompt } = req.body;

    if (!code || !tool) {
      return res.status(400).json({ error: 'Missing required parameters: code, tool.' });
    }

    const ai = getAiClient();
    const systemInstruction = `Você é um Engenheiro de Software Sênior, Especialista de Cloud e SRE de nível mundial.
Especializado em Infraestrutura como Código (Terraform e AWS CloudFormation).
Seu objetivo é analisar, otimizar, explicar ou refinar o código IaC enviado pelo usuário de acordo com as instruções dele.

Regras estritas:
1. Retorne APENAS o código de infraestrutura ajustado se solicitado, ou uma resposta explicativa clara com trechos de código formatados em Markdown.
2. Siga as melhores práticas da plataforma de destino (${provider ? provider.toUpperCase() : 'Nuvem'}).
3. Sempre inclua comentários de melhores práticas de segurança (ex: portas restritas no Security Group, criptografia ativada, bloqueio de acesso público).`;

    const userMessage = `Código original (${tool}):
\`\`\`${tool === 'terraform' ? 'hcl' : 'yaml'}
${code}
\`\`\`

Instruções do usuário: ${prompt || 'Forneça uma análise de segurança e optimize este código se necessário.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const refinedText = response.text || 'Nenhuma resposta recebida da IA.';
    res.json({ result: refinedText });
  } catch (error: any) {
    console.error('Error with Gemini refinement service:', error);
    res.status(500).json({
      error: error.message || 'Erro inesperado no serviço de IA da Google.',
    });
  }
});

// Setup Vite Dev server or static files depending on the environment
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[IaC Generator Server] Running on http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch((error) => {
  console.error('Failed to start server:', error);
});
