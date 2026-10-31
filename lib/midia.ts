// Escolha de boneco do mapa muscular, foto e vídeo pelo nome do treino ou
// exercício. Mesma regra do protótipo (mapOf / photoOf). Quando o catálogo real
// entrar, cada exercício terá seu boneco e seu vídeo gravados no banco e estas
// funções viram só o plano B.

export type Sexo = "feminino" | "masculino";

const tem = (texto: string, ...palavras: string[]) =>
  palavras.some((p) => texto.includes(p));

export function bonecoDe(nome: string, sexo: Sexo): string {
  const t = (nome || "").toLowerCase();
  const h = (...w: string[]) => tem(t, ...w);
  const chave = h("médio", "abdução", "abdutor")
    ? "abdutores-gluteo-medio"
    : h("posterior", "stiff") && h("glúteo")
      ? "posteriores-gluteos"
      : h("quadríceps", "agachamento", "afundo") && h("glúteo")
        ? "quadriceps-gluteos"
        : h("glúteo", "elevação pélvica", "ponte")
          ? "gluteos"
          : h("posterior", "flexora")
            ? "posteriores"
            : h("quadríceps", "extensora", "leg press")
              ? "quadriceps"
              : h("pernas")
                ? "grupo-pernas"
                : h("lombar")
                  ? "lombar"
                  : h("abdômen", "core", "prancha")
                    ? "grupo-core"
                    : h("costas", "remada", "puxada")
                      ? "grupo-costas"
                      : h("peito", "supino")
                        ? "peitoral"
                        : h("ombro", "desenvolvimento")
                          ? "deltoide"
                          : h("braço", "bíceps", "tríceps", "rosca")
                            ? "grupo-bracos"
                            : "fullbody";
  return `/assets/bonecos/${sexo}/boneco-${chave}.svg`;
}

export function fotoDe(nome: string): string {
  const t = (nome || "").toLowerCase();
  const h = (...w: string[]) => tem(t, ...w);
  const chave = h("mini band", "elástico", "abdução", "médio", "casa", "core", "mobilidade", "alongamento", "lombar")
    ? "mini-band"
    : h("posterior", "stiff", "costas", "flexora")
      ? "stiff"
      : h("afundo", "quadríceps", "pernas", "búlgaro")
        ? "afundo"
        : h("glúteo", "elevação", "ponte", "polia")
          ? "elevacao-pelvica"
          : "agachamento";
  return `/assets/fotos/richard-${chave}.png`;
}

export const videoDe = (arquivo: string | undefined) =>
  arquivo ? `/assets/videos/${arquivo}.mp4` : undefined;
