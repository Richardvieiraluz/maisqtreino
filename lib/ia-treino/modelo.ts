import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { cleanEnv } from "../supabase/env";
import { MAX_TOKENS, TIMEOUT_MS, type ChamarModelo } from "./gerar-aluno";

// Chamada real à IA (Anthropic). Chave e modelo vêm das variáveis da Vercel, nunca do código.
// Sem ANTHROPIC_MODEL, usa o mesmo padrão do +Q Pilates.
export const MODELO_IA = cleanEnv(process.env.ANTHROPIC_MODEL) || "claude-opus-4-8";
export const iaConfigurada = () => !!cleanEnv(process.env.ANTHROPIC_API_KEY);

let cliente: Anthropic | null = null;
const anthropic = () => (cliente ??= new Anthropic({ apiKey: cleanEnv(process.env.ANTHROPIC_API_KEY) }));

export const chamarModeloReal: ChamarModelo = async ({ sistema, messages, jsonSchema }) => {
  const msg = await anthropic().messages.create(
    { model: MODELO_IA, max_tokens: MAX_TOKENS, system: sistema, messages, output_config: { format: { type: "json_schema", schema: jsonSchema } } },
    { timeout: TIMEOUT_MS, maxRetries: 0 },
  );
  let texto = "";
  for (const b of msg.content) if (b.type === "text") texto += b.text;
  return { texto, inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens, stopReason: msg.stop_reason };
};

/** Pedido simples com resposta em JSON (Explicações do Master). */
export async function pedirJson(sistema: string, texto: string, schema: Record<string, unknown>, maxTokens = 4000): Promise<string> {
  const msg = await anthropic().messages.create(
    { model: MODELO_IA, max_tokens: maxTokens, system: sistema, messages: [{ role: "user", content: texto }], output_config: { format: { type: "json_schema", schema } } },
    { timeout: 120_000, maxRetries: 1 },
  );
  let saida = "";
  for (const b of msg.content) if (b.type === "text") saida += b.text;
  return saida;
}
