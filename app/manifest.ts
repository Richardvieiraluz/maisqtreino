import type { MetadataRoute } from "next";

// Manifest do PWA. Os ícones (192 e 512 px) entram quando a arte do ícone
// estiver pronta. O service worker para notificações vem na etapa dos lembretes.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "+Q Treino",
    short_name: "+Q Treino",
    description: "Treinos prontos, montados por mim, com valor acessível.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
  };
}
