// Fotos do corpo guardadas SÓ no aparelho (IndexedDB). Nunca saem do celular.
// Quando houver backend, vão para um armazenamento privado do Supabase acessível
// só pelo próprio aluno (nem o Master vê).

export type Angulo = "FRENTE" | "LADO" | "COSTAS";
export const ANGULOS: Angulo[] = ["FRENTE", "LADO", "COSTAS"];

export interface FotoCorpo {
  id: string;
  /** aaaa-mm-dd */
  data: string;
  angulo: Angulo;
  imagem: Blob;
}

const BANCO = "maisqtreino";
const LOJA = "fotos-corpo";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA, { keyPath: "id" });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}

async function comLoja<T>(modo: IDBTransactionMode, fn: (l: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise((ok, erro) => {
    const t = db.transaction(LOJA, modo);
    const req = fn(t.objectStore(LOJA));
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
    t.oncomplete = () => db.close();
  });
}

export async function listarFotos(): Promise<FotoCorpo[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const todas = await comLoja<FotoCorpo[]>("readonly", (l) => l.getAll());
    return todas.sort((a, b) => a.data.localeCompare(b.data));
  } catch {
    return [];
  }
}

export async function salvarFoto(imagem: Blob, angulo: Angulo, data: string) {
  const id = `${data}-${angulo}`;
  await comLoja("readwrite", (l) => l.put({ id, data, angulo, imagem } satisfies FotoCorpo));
}

export async function apagarFotos() {
  if (typeof indexedDB === "undefined") return;
  await comLoja("readwrite", (l) => l.clear());
}

export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const dataCurta = (iso: string, ano = false) => {
  const [a, m, d] = iso.split("-");
  return `${d} ${MESES[+m - 1]}${ano ? ` ${a}` : ""}`;
};
