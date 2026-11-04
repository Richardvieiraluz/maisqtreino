// Webhook da Eduzz (Developer Hub, eventos myeduzz.*): conferência da assinatura e leitura dos avisos.
// Funções puras, sem banco. Quem grava é lib/dados/eduzz.ts; quem recebe é app/api/webhooks/eduzz.
//
// Documentação: https://developers.eduzz.com/reference/webhook/myeduzz-invoice-paid e
// .../myeduzz-contract-updated. Segurança: cabeçalho x-signature = HMAC-SHA256(chave, corpo).
import { createHmac, timingSafeEqual } from "node:crypto";

const DIA = 86_400_000;
/** Folga depois do vencimento da assinatura, para a renovação cair sem cortar o aluno no meio do dia. */
const FOLGA_DIAS = 3;

/** Confere o x-signature. Aceita hex ou base64 (a documentação não diz qual) e compara em tempo constante. */
export function assinaturaValida(corpo: string, cabecalho: string | null, chave: string): boolean {
  if (!cabecalho || !chave) return false;
  const recebido = cabecalho.trim().replace(/^sha256=/i, "");
  const mac = createHmac("sha256", chave).update(corpo, "utf8").digest();
  const iguais = (a: string) => {
    const x = Buffer.from(a);
    const y = Buffer.from(recebido);
    return x.length === y.length && timingSafeEqual(x, y);
  };
  return iguais(mac.toString("hex")) || iguais(mac.toString("base64"));
}

/** O que aconteceu com um produto, do ponto de vista do acesso. */
export type Fato =
  | { tipo: "pago"; em: string }
  | { tipo: "contrato"; status: string; proximoVencimento: string | null; acessoAte: string | null }
  | { tipo: "reembolso" };

export interface AvisoLido {
  /** Id do evento na Eduzz (protege contra aviso repetido). */
  chave: string;
  evento: string;
  email: string | null;
  nome: string;
  contratoId: string | null;
  faturaId: string | null;
  /** Produtos da Eduzz citados no aviso (com order bump podem ser vários). */
  produtos: string[];
  fato: Fato | null;
  /** Resumo sem dados pessoais (CPF, endereço e telefone ficam de fora), para o registro. */
  resumo: Record<string, unknown>;
}

const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/** Lê o corpo do aviso. Devolve null se não tiver o mínimo (id e evento). */
export function lerAviso(corpo: unknown): AvisoLido | null {
  const b = obj(corpo);
  const chave = txt(b.id);
  const evento = txt(b.event);
  if (!chave || !evento) return null;
  const d = obj(b.data);
  const contrato = obj(d.contract);
  const base = { chave, evento, contratoId: txt(contrato.id), faturaId: null as string | null };

  if (evento === "myeduzz.invoice_paid" || evento === "myeduzz.invoice_refunded") {
    // Quem usa o acesso é o aluno; sem aluno separado, o comprador.
    const pessoa = obj(d.student).email ? obj(d.student) : obj(d.buyer);
    const itens = Array.isArray(d.items) ? d.items.map(obj) : [];
    const produtos = itens.map((i) => txt(i.productId)).filter((x): x is string => !!x);
    const estornado = obj(d.chargeback).status === "refunded";
    const fato: Fato =
      evento === "myeduzz.invoice_refunded" || estornado ? { tipo: "reembolso" } : { tipo: "pago", em: txt(d.paidAt) ?? new Date().toISOString() };
    return {
      ...base,
      faturaId: txt(d.id),
      email: txt(pessoa.email)?.toLowerCase() ?? null,
      nome: txt(pessoa.name) ?? "",
      produtos,
      fato,
      resumo: { evento, fatura: txt(d.id), status: txt(d.status), contrato: base.contratoId, produtos, pago: txt(d.paidAt), estorno: txt(obj(d.chargeback).status) },
    };
  }

  if (evento === "myeduzz.contract_created" || evento === "myeduzz.contract_updated") {
    const cliente = obj(d.customer);
    const produtos = (Array.isArray(d.products) ? d.products.map(obj) : []).map((p) => txt(p.id)).filter((x): x is string => !!x);
    const recorrencia = obj(contrato.recurrence);
    const status = txt(contrato.status) ?? "";
    return {
      ...base,
      email: txt(cliente.email)?.toLowerCase() ?? null,
      nome: txt(cliente.name) ?? "",
      produtos,
      fato: { tipo: "contrato", status, proximoVencimento: txt(recorrencia.nextDue), acessoAte: txt(obj(contrato.contentAccess).accessExpirationDate) },
      resumo: { evento, contrato: base.contratoId, status, motivo: txt(d.reason), produtos, proximoVencimento: txt(recorrencia.nextDue) },
    };
  }

  // Ping de teste e eventos que o app não usa: registra e ignora.
  return { ...base, email: null, nome: "", produtos: [], fato: null, resumo: { evento } };
}

export type Periodo = "mensal" | "anual" | "vitalicio";
export interface MudancaAcesso {
  status: "ativo" | "pausado" | "cancelado" | "reembolsado";
  /** undefined = não mexe na data que já existe. */
  validoAte?: string | null;
}

const somaDias = (iso: string, dias: number) => new Date(Date.parse(iso) + dias * DIA).toISOString();

/**
 * Como o acesso a um produto fica depois do fato. null = nada a mudar.
 * Regra combinada: assinatura que não renova pausa na hora (atrasada, inadimplente ou suspensa);
 * cancelada continua até o fim do período já pago, depois some; reembolso corta.
 */
export function mudancaDoAcesso(periodo: Periodo, fato: Fato, agora = Date.now()): MudancaAcesso | null {
  if (fato.tipo === "reembolso") return { status: "reembolsado" };
  if (fato.tipo === "pago") {
    if (periodo === "vitalicio") return { status: "ativo", validoAte: null };
    // Até o aviso do contrato chegar com o próximo vencimento: 1 mês ou 1 ano a partir do pagamento.
    return { status: "ativo", validoAte: somaDias(fato.em, (periodo === "mensal" ? 30 : 365) + FOLGA_DIAS) };
  }
  if (periodo === "vitalicio") return null; // contrato é só de assinatura
  switch (fato.status) {
    case "upToDate":
    case "trial":
    case "free":
      return { status: "ativo", validoAte: fato.proximoVencimento ? somaDias(fato.proximoVencimento, FOLGA_DIAS) : undefined };
    case "late":
    case "defaulter":
    case "suspended":
      return { status: "pausado" };
    case "canceled":
    case "finished":
      if (fato.acessoAte && Date.parse(fato.acessoAte) > agora) return { status: "ativo", validoAte: fato.acessoAte };
      return { status: "cancelado" };
    default:
      return null; // awaitingPayment e desconhecidos: espera a fatura paga
  }
}

/** Fatos que podem criar a conta do aluno (os outros só mexem em quem já existe). */
export const criaConta = (f: Fato | null) => f?.tipo === "pago" || (f?.tipo === "contrato" && ["upToDate", "trial", "free"].includes(f.status));
