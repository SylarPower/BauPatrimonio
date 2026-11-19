// Preferenze non sensibili. Nessun importo o token in localStorage.
export const pref = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Modalità con storage disabilitato: preferenza solo in memoria. */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* Nessun dato finanziario coinvolto. */
    }
  },
};
