export default function CloudPanel({ personal }: { personal: boolean }) {
  return (
    <section className="card cloud-panel">
      <h3>{personal ? "Archivio online privato" : "Demo separata"}</h3>
      <p>
        {personal
          ? "Il tuo account è collegato a Supabase. Il caricamento avviene all’accesso e le modifiche vengono salvate automaticamente online. Lo stato del salvataggio è sempre visibile nella pagina."
          : "I dati di esempio restano sul dispositivo: non vengono caricati nel tuo account."}
      </p>
      <p>
        Non occorre configurare URL o chiavi. Sul telefono accedi con lo stesso
        account. Evita modifiche contemporanee: in caso di conflitto il
        salvataggio si ferma, senza sovrascritture automatiche.
      </p>
      <a
        className="inline-link"
        href={import.meta.env.BASE_URL + "GUIDA.html#cloud"}
        target="_blank"
        rel="noreferrer"
      >
        Guida archivio online ↗
      </a>
    </section>
  );
}
