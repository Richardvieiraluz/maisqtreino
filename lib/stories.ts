// Desenha o stories 1080 × 1920 em canvas, nos 3 modelos do design (Capa, Números,
// Lista). O mesmo canvas serve de prévia (reduzido na tela) e de arquivo para
// compartilhar, então o que o aluno vê é exatamente o que vai para o Instagram.

export type ModeloStories = "A" | "B" | "C";

export interface DadosStories {
  treino: string;
  palavraDestaque: string;
  minutos: number;
  sequencia: number;
  instagram: string;
}

const W = 270;
const H = 480;
export const ESCALA = 4; // 270 × 480 → 1080 × 1920

const COR = { tinta: "#111111", amarelo: "#FFE600", cinza: "#5C5C5C", linha: "#D6D5D0", fundoSuave: "#F4F3EE", apoioEscuro: "#B5B5B0" };
const FONTE = '"Archivo Variable", "Archivo", system-ui, sans-serif';

type Ctx = CanvasRenderingContext2D & { fontStretch?: string; letterSpacing?: string };

function fonte(ctx: Ctx, peso: number, tamanho: number, condensada: boolean, espaco = 0) {
  ctx.font = `${peso} ${tamanho}px ${FONTE}`;
  if ("fontStretch" in ctx) ctx.fontStretch = condensada ? "extra-condensed" : "normal";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${espaco}px`;
}

function texto(ctx: Ctx, t: string, x: number, y: number, cor: string, alinhar: CanvasTextAlign = "left") {
  ctx.fillStyle = cor;
  ctx.textAlign = alinhar;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(t, x, y);
}

function logo(ctx: Ctx, x: number, y: number, escuro = false) {
  fonte(ctx, 900, 11, true, 0.4);
  const q = "+Q";
  const wq = ctx.measureText(q).width;
  ctx.fillStyle = COR.amarelo;
  ctx.fillRect(x, y, wq + 8, 15);
  texto(ctx, q, x + 4, y + 11.5, COR.tinta);
  texto(ctx, "TREINO", x + wq + 12, y + 11.5, escuro ? "#FFFFFF" : COR.tinta);
}

/** Quebra o título em linhas que cabem na largura. */
function linhas(ctx: Ctx, palavras: string[], largura: number) {
  const out: string[][] = [];
  let atual: string[] = [];
  for (const p of palavras) {
    const teste = [...atual, p].join(" ");
    if (atual.length && ctx.measureText(teste).width > largura) {
      out.push(atual);
      atual = [p];
    } else atual.push(p);
  }
  if (atual.length) out.push(atual);
  return out;
}

/** Título em caixa alta com uma palavra destacada (fundo amarelo ou texto amarelo). Retorna a altura. */
function titulo(ctx: Ctx, frase: string, destaque: string, x: number, yTopo: number, tamanho: number, largura: number, cor: string, modo: "fundo" | "texto") {
  fonte(ctx, 850, tamanho, true, -tamanho * 0.02);
  const palavras = frase.toUpperCase().split(" ");
  const alvo = destaque.toUpperCase().replace(/[.]/g, "");
  const ls = linhas(ctx, palavras, largura);
  const entre = tamanho * 0.9;
  ls.forEach((l, i) => {
    const base = yTopo + tamanho * 0.82 + i * entre;
    let cx = x;
    l.forEach((p, j) => {
      const limpa = p.replace(/[.]/g, "");
      const w = ctx.measureText(p).width;
      const ehDestaque = limpa === alvo;
      if (ehDestaque && modo === "fundo") {
        const wl = ctx.measureText(limpa).width;
        ctx.fillStyle = COR.amarelo;
        ctx.fillRect(cx - 3, base - tamanho * 0.8, wl + 6, tamanho * 0.92);
      }
      if (ehDestaque && p !== limpa) {
        texto(ctx, limpa, cx, base, modo === "texto" ? COR.amarelo : cor);
        texto(ctx, p.slice(limpa.length), cx + ctx.measureText(limpa).width, base, cor);
      } else texto(ctx, p, cx, base, ehDestaque && modo === "texto" ? COR.amarelo : cor);
      cx += w + (j < l.length - 1 ? ctx.measureText(" ").width : 0);
    });
  });
  return ls.length * entre;
}

/** Imagem cobrindo o retângulo (como object-fit: cover). */
function cobrir(ctx: Ctx, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const r = Math.max(w / img.width, h / img.height);
  const iw = img.width * r;
  const ih = img.height * r;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
}

function espacoSelfie(ctx: Ctx, x: number, y: number, w: number, h: number, img: (CanvasImageSource & { width: number; height: number }) | null) {
  if (img) return cobrir(ctx, img, x, y, w, h);
  ctx.fillStyle = COR.fundoSuave;
  ctx.fillRect(x, y, w, h);
  fonte(ctx, 700, 9, false, 0.7);
  texto(ctx, "SUA SELFIE", x + w / 2, y + h / 2 + 3, COR.cinza, "center");
}

export function desenharStories(canvas: HTMLCanvasElement, modelo: ModeloStories, d: DadosStories, img: (CanvasImageSource & { width: number; height: number }) | null) {
  canvas.width = W * ESCALA;
  canvas.height = H * ESCALA;
  const ctx = canvas.getContext("2d") as Ctx | null;
  if (!ctx) return;
  ctx.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  if (modelo === "A") {
    espacoSelfie(ctx, 0, 0, W, H, img);
    logo(ctx, 14, 14);
    // Painel branco de baixo: altura conforme o título.
    fonte(ctx, 850, 30, true, -0.6);
    const nLinhas = linhas(ctx, d.treino.toUpperCase().split(" "), W - 28).length;
    const alturaPainel = 12 + 9 + 8 + nLinhas * 27 + 10 + 11 + 14;
    const yp = H - alturaPainel;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, yp, W, alturaPainel);
    ctx.fillStyle = COR.tinta;
    ctx.fillRect(0, yp, W, 3);
    fonte(ctx, 700, 9, false, 0.8);
    texto(ctx, "TREINO DE HOJE", 14, yp + 3 + 12 + 7, COR.cinza);
    const ht = titulo(ctx, d.treino, d.palavraDestaque, 14, yp + 3 + 12 + 9 + 6, 30, W - 28, COR.tinta, "fundo");
    const yb = yp + 3 + 12 + 9 + 6 + ht + 14;
    fonte(ctx, 800, 11, false, 0.66);
    texto(ctx, `${d.minutos} MIN · ${d.sequencia} DIAS SEGUIDOS`, 14, yb, COR.tinta);
    fonte(ctx, 700, 10, false, 0);
    texto(ctx, d.instagram, W - 14, yb, COR.tinta, "right");
  }

  if (modelo === "B") {
    espacoSelfie(ctx, 0, 0, W, 280, img);
    logo(ctx, 14, 14);
    ctx.fillStyle = COR.tinta;
    ctx.fillRect(0, H - 200, W, 200);
    const y0 = H - 200 + 14;
    titulo(ctx, "Treino feito.", "feito", 14, y0, 26, W - 28, "#FFFFFF", "texto");
    fonte(ctx, 400, 10, false, 0);
    texto(ctx, d.treino, 14, y0 + 23 + 14, COR.apoioEscuro);
    const yn = H - 14 - 10 - 10 - 12;
    const num = (v: number, rotulo: string, x: number) => {
      fonte(ctx, 900, 48, true, -1);
      texto(ctx, String(v), x, yn - 2, "#FFFFFF");
      fonte(ctx, 700, 9, false, 0.8);
      texto(ctx, rotulo, x, yn + 10, COR.apoioEscuro);
    };
    num(d.minutos, "MINUTOS", 14);
    num(d.sequencia, "DIAS SEGUIDOS", 14 + (W - 28 + 10) / 2);
    fonte(ctx, 700, 10, false, 0);
    texto(ctx, d.instagram, 14, H - 14, "#FFFFFF");
  }

  if (modelo === "C") {
    logo(ctx, 14, 14);
    const ht = titulo(ctx, "Treino feito.", "feito", 14, 14 + 15 + 18, 34, W - 28, COR.tinta, "fundo");
    const yf = 14 + 15 + 18 + ht + 12;
    espacoSelfie(ctx, 14, yf, W - 28, 200, img);
    ctx.strokeStyle = COR.tinta;
    ctx.lineWidth = 1;
    ctx.strokeRect(14.5, yf + 0.5, W - 29, 199);
    const lista: [string, string][] = [
      ["Treino", d.treino],
      ["Duração", `${d.minutos} min`],
      ["Sequência", `${d.sequencia} dias`],
    ];
    let y = yf + 200 + 10;
    lista.forEach(([k, v], i) => {
      fonte(ctx, 400, 10, false, 0);
      texto(ctx, k, 14, y + 15, COR.cinza);
      fonte(ctx, 850, 12, true, 0);
      texto(ctx, v, W - 14, y + 15, COR.tinta, "right");
      y += 24;
      ctx.fillStyle = i === lista.length - 1 ? COR.tinta : COR.linha;
      ctx.fillRect(14, y - (i === lista.length - 1 ? 3 : 1), W - 28, i === lista.length - 1 ? 3 : 1);
    });
    fonte(ctx, 700, 10, false, 0);
    texto(ctx, d.instagram, 14, H - 14, COR.tinta);
  }
}

/** Garante que a Archivo esteja carregada antes de desenhar (canvas não espera fontes). */
export async function carregarFontes() {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all(
    ["400", "700", "800", "850", "900"].map((p) => document.fonts.load(`${p} 20px "Archivo Variable"`).catch(() => undefined)),
  );
}

export async function compartilharOuBaixar(canvas: HTMLCanvasElement, nome: string, texto: string): Promise<"compartilhado" | "baixado" | "cancelado"> {
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
  if (!blob) return "cancelado";
  const arquivo = new File([blob], nome, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [arquivo] })) {
    try {
      await nav.share({ files: [arquivo], text: texto });
      return "compartilhado";
    } catch {
      return "cancelado";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "baixado";
}
