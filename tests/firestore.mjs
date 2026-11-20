// Solo emulator locale: non usa chiavi/config produzione né invia email.
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  runTransaction,
} from "firebase/firestore";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !/^(127\.0\.0\.1|localhost):\d+$/.test(host))
  throw Error(
    "Avvia Firestore Emulator e imposta FIRESTORE_EMULATOR_HOST=127.0.0.1:8080. Test mai eseguito in produzione.",
  );
const [hostname, port] = host.split(":");
const env = await initializeTestEnvironment({
  projectId: "demo-baupatrimonio",
  firestore: {
    host: hostname,
    port: Number(port),
    rules: await readFile("firestore.rules", "utf8"),
  },
});
try {
  await env.clearFirestore();
  const a = env
    .authenticatedContext("alice", { email_verified: true })
    .firestore();
  const b = env
    .authenticatedContext("bob", { email_verified: true })
    .firestore();
  const unverified = env
    .authenticatedContext("unverified", { email_verified: false })
    .firestore();
  const anon = env.unauthenticatedContext().firestore();
  const vault = { payload: '{"synthetic":true}', revision: 1 };
  await assertSucceeds(setDoc(doc(a, "vaults/alice"), vault));
  await assertSucceeds(getDoc(doc(a, "vaults/alice")));
  await assertFails(getDoc(doc(b, "vaults/alice")));
  await assertFails(setDoc(doc(b, "vaults/alice"), { ...vault, revision: 2 }));
  await assertFails(getDoc(doc(anon, "vaults/alice")));
  await assertFails(setDoc(doc(anon, "vaults/anonymous"), vault));
  await assertFails(setDoc(doc(unverified, "vaults/unverified"), vault));
  await assertFails(getDoc(doc(unverified, "vaults/alice")));
  await assertFails(getDocs(collection(a, "vaults")));
  await assertFails(deleteDoc(doc(a, "vaults/alice")));
  await assertFails(setDoc(doc(a, "other/alice"), vault));
  await assertFails(setDoc(doc(a, "vaults/alice"), { ...vault, revision: 3 }));
  await assertFails(
    setDoc(doc(a, "vaults/alice"), { ...vault, revision: 2, extra: "no" }),
  );
  await assertFails(
    setDoc(doc(a, "vaults/alice"), { payload: 5, revision: 2 }),
  );
  await assertFails(
    setDoc(doc(a, "vaults/alice"), {
      payload: "x".repeat(900001),
      revision: 2,
    }),
  );
  await assertSucceeds(
    setDoc(doc(a, "vaults/alice"), { ...vault, revision: 2 }),
  );
  // Simula una scrittura intervenuta dopo la lettura del dispositivo.
  const stale = (await getDoc(doc(a, "vaults/alice"))).data().revision;
  await assertSucceeds(
    setDoc(doc(a, "vaults/alice"), { ...vault, revision: 3 }),
  );
  await assertFails(
    setDoc(doc(a, "vaults/alice"), { ...vault, revision: stale + 1 }),
  );
  await assertSucceeds(
    runTransaction(a, async (transaction) => {
      const ref = doc(a, "vaults/alice");
      const current = await transaction.get(ref);
      transaction.set(ref, { ...vault, revision: current.data().revision + 1 });
    }),
  );
  assert.equal((await getDoc(doc(a, "vaults/alice"))).data().revision, 4);
  console.log(
    "PASS: isolamento Firestore, conferma email, schema, revisioni, limiti e accessi negati. Solo emulator.",
  );
} finally {
  await env.cleanup();
}
