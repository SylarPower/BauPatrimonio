import { isStore } from "./validation";
import { empty, type Store } from "./model";
import { cloudConfig } from "./cloud-config";
// REST ufficiali Firebase: nessun SDK analytics, cache persistente o funzione a pagamento.
export const authRedirectUrl = "https://sylarpower.github.io/BauPatrimonio/";
const authBase = "https://identitytoolkit.googleapis.com/v1/accounts:";
const database = `projects/${cloudConfig.projectId}/databases/(default)/documents`;
const firestore = `https://firestore.googleapis.com/v1/${database}`;
type Session = {
  uid: string;
  token: string;
  refresh: string;
  expires: number;
  revision: number;
  updateTime?: string;
  ready: boolean;
  renewing?: Promise<void>;
};
let session: Session | undefined;
let generation = 0;
let queue: Promise<unknown> = Promise.resolve();
function passwordCheck(password: string) {
  if (password.length < 10 || password.length > 128)
    throw Error("Usa una password da 10 a 128 caratteri.");
}
async function responseJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (response.ok) return data;
  const code = String(data.error?.message || data.error?.status || "");
  if (
    response.status === 429 ||
    /TOO_MANY_ATTEMPTS|QUOTA_EXCEEDED|RESOURCE_EXHAUSTED/.test(code)
  )
    throw Error(
      "Troppe richieste o quota gratuita raggiunta. Attendi prima di riprovare; non richiedere altre email.",
    );
  if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(code))
    throw Error(
      "Email o password non corrette. Usa Password dimenticata se necessario.",
    );
  if (/EMAIL_EXISTS/.test(code))
    throw Error(
      "Registrazione non completata. Se hai già un account Firebase, usa Accedi o Password dimenticata.",
    );
  if (/INVALID_OOB_CODE|EXPIRED_OOB_CODE/.test(code))
    throw Error("Link email scaduto o non valido. Richiedi un nuovo link.");
  if (/WEAK_PASSWORD/.test(code))
    throw Error("Scegli una password più lunga e difficile da indovinare.");
  if (
    /OPERATION_NOT_ALLOWED|CONFIGURATION_NOT_FOUND|API_KEY_INVALID/.test(code)
  )
    throw Error(
      "Configurazione Firebase non disponibile: il gestore deve verificare Email/Password e la configurazione web.",
    );
  if (response.status === 403 || /PERMISSION_DENIED/.test(code))
    throw Error(
      "Accesso Firestore negato. Verifica email confermata e pubblicazione delle regole di sicurezza BauPatrimonio; nessun dato sovrascritto.",
    );
  if (
    response.status === 409 ||
    /FAILED_PRECONDITION|ABORTED|ALREADY_EXISTS/.test(code)
  )
    throw Error(
      "Conflitto con un altro dispositivo. Ricarica i dati online: nessun dato remoto sovrascritto.",
    );
  if (/INVALID_EMAIL/.test(code))
    throw Error("Inserisci un indirizzo email valido.");
  throw Error(
    "Operazione Firebase non riuscita. Riprova più tardi; nessun salvataggio dichiarato riuscito.",
  );
}
async function send(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
}
async function authRequest(action: string, body: Record<string, unknown>) {
  return responseJson(
    await send(authBase + action + "?key=" + cloudConfig.apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
async function credentials(email: string, password: string) {
  return authRequest("signInWithPassword", {
    email: email.trim(),
    password,
    returnSecureToken: true,
  });
}
export function cloudLogout() {
  generation++;
  session = undefined;
}
export function cloudActive() {
  return !!session?.ready;
}
async function token(current: Session) {
  if (session !== current) throw Error("Sessione terminata.");
  if (Date.now() > current.expires - 30000) {
    current.renewing ??= (async () => {
      const data = await responseJson(
        await send(
          "https://securetoken.googleapis.com/v1/token?key=" +
            cloudConfig.apiKey,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: current.refresh,
            }).toString(),
          },
        ),
      );
      if (session !== current) throw Error("Sessione terminata.");
      current.token = data.id_token;
      current.refresh = data.refresh_token;
      current.expires = Date.now() + Number(data.expires_in) * 1000;
    })().finally(() => {
      current.renewing = undefined;
    });
    await current.renewing;
  }
  return current.token;
}
export async function cloudLogin(email: string, password: string) {
  cloudLogout();
  const ticket = generation;
  const data = await credentials(email, password);
  const info = await authRequest("lookup", { idToken: data.idToken });
  if (ticket !== generation) throw Error("Accesso annullato.");
  const user = info.users?.[0];
  if (!user?.emailVerified)
    throw Error(
      "Indirizzo email non ancora confermato. Apri il link di conferma, poi accedi di nuovo.",
    );
  if (
    !data.localId ||
    user.localId !== data.localId ||
    !data.idToken ||
    !data.refreshToken
  )
    throw Error("Risposta di accesso non valida.");
  session = {
    uid: data.localId,
    token: data.idToken,
    refresh: data.refreshToken,
    expires: Date.now() + Number(data.expiresIn) * 1000,
    revision: 0,
    ready: false,
  };
}
function documentName(current: Session) {
  return database + "/vaults/" + encodeURIComponent(current.uid);
}
export async function cloudRead() {
  const current = session;
  if (!current) throw Error("Accedi al tuo archivio online.");
  current.ready = false;
  const bearer = await token(current);
  const response = await send(
    firestore + "/vaults/" + encodeURIComponent(current.uid),
    { headers: { Authorization: "Bearer " + bearer } },
  );
  if (session !== current)
    throw Error("Sessione terminata: risposta ignorata.");
  if (response.status === 404) {
    current.revision = 0;
    current.updateTime = undefined;
    return undefined;
  }
  const data = await responseJson(response);
  if (session !== current)
    throw Error("Sessione terminata: risposta ignorata.");
  let document: unknown;
  try {
    document = JSON.parse(data.fields.payload.stringValue);
  } catch {
    throw Error("Documento cloud non valido: nessun dato locale sostituito.");
  }
  const revision = Number(data.fields.revision?.integerValue);
  if (
    !isStore(document) ||
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    !data.updateTime
  )
    throw Error("Documento cloud non valido: nessun dato locale sostituito.");
  current.revision = revision;
  current.updateTime = data.updateTime;
  return document;
}
export function cloudUseLoaded() {
  if (session) session.ready = true;
}
export function cloudSave(document: Store, initial = false): Promise<void> {
  const current = session;
  if (!current)
    return Promise.reject(
      Error("Accesso richiesto: nessun dato salvato online."),
    );
  if (!initial && !current.ready)
    return Promise.reject(
      Error(
        "Salvataggio interrotto. Ricarica i dati online prima di continuare.",
      ),
    );
  // Snapshot al momento della richiesta, non quando si svuota la coda.
  const payload = JSON.stringify(document);
  const work = queue.then(async () => {
    if (session !== current || (!initial && !current.ready))
      throw Error("Salvataggio interrotto: ricarica i dati online.");
    try {
      if (!isStore(JSON.parse(payload)))
        throw Error("Dati non validi: invio annullato.");
      if (new TextEncoder().encode(payload).length > 900000)
        throw Error(
          "Archivio troppo grande per il documento Firestore. Nessun dato sovrascritto: conserva una copia dal Profilo.",
        );
      const bearer = await token(current);
      const data = await responseJson(
        await send(firestore + ":commit", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + bearer,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            writes: [
              {
                update: {
                  name: documentName(current),
                  fields: {
                    payload: { stringValue: payload },
                    revision: { integerValue: String(current.revision + 1) },
                  },
                },
                currentDocument: current.updateTime
                  ? { updateTime: current.updateTime }
                  : { exists: false },
              },
            ],
          }),
        }),
      );
      if (session !== current)
        throw Error("Sessione terminata: risposta ignorata.");
      if (!data.writeResults?.[0]?.updateTime)
        throw Error("Conferma salvataggio mancante.");
      current.updateTime = data.writeResults[0].updateTime;
      current.revision++;
      current.ready = true;
    } catch (err) {
      current.ready = false;
      throw err;
    }
  });
  queue = work.catch(() => {});
  return work;
}
export async function cloudOpen(email: string, password: string) {
  await cloudLogin(email, password);
  const current = session;
  try {
    const existing = await cloudRead();
    if (existing) {
      cloudUseLoaded();
      return existing;
    }
    const document = empty();
    await cloudSave(document, true);
    return document;
  } catch (err) {
    if (session === current) cloudLogout();
    throw err;
  }
}
async function verification(idToken: string) {
  await authRequest("sendOobCode", {
    requestType: "VERIFY_EMAIL",
    idToken,
    continueUrl: authRedirectUrl,
  });
}
export async function cloudSignUp(email: string, password: string) {
  passwordCheck(password);
  const data = await authRequest("signUp", {
    email: email.trim(),
    password,
    returnSecureToken: true,
  });
  try {
    await verification(data.idToken);
  } catch {
    throw Error(
      "Account creato, ma invio email di conferma non riuscito. Usa il reinvio con email e password, senza creare un secondo account.",
    );
  }
}
// Firebase richiede la password per ottenere un token temporaneo di verifica.
// Non viene creata una sessione dell'archivio e il token non è conservato.
export async function cloudResendConfirmation(email: string, password: string) {
  const data = await credentials(email, password);
  await verification(data.idToken);
}
export async function cloudRequestRecovery(email: string) {
  await authRequest("sendOobCode", {
    requestType: "PASSWORD_RESET",
    email: email.trim(),
    continueUrl: authRedirectUrl,
  });
}
export async function cloudResetPassword(oobCode: string, password: string) {
  passwordCheck(password);
  await authRequest("resetPassword", { oobCode, newPassword: password });
}
export async function cloudConfirmEmail(oobCode: string) {
  await authRequest("update", { oobCode });
}
