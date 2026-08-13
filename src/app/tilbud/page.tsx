import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import LogoutButton from "../../components/logout-button";

type OfferRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
};

export default async function OffersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: offersRaw } = await supabase
    .from("offers")
    .select("*")
    .eq("active", true)
    .order("name");

  const offers = (offersRaw ?? []) as OfferRow[];

  return (
    <main className="hbkcc-page">
      <div className="hbkcc-shell">
        <section className="hbkcc-card p-8 md:p-10">
          <div className="mb-6 flex justify-end">
            <LogoutButton />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
            Mine undervisningstilbud
          </p>
          <h1 className="mt-2 text-4xl font-bold">Vælg, hvor du vil fortsætte</h1>
          <p className="mt-3 text-[var(--text-muted)]">
            Du ser kun de tilbud, som din konto er tilknyttet.
          </p>

          {offers.length === 0 ? (
            <div className="hbkcc-soft-card mt-8 p-6">
              <h2 className="text-xl font-semibold">Ingen tilbud tilknyttet endnu</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Kontakt en administrator, som kan tilknytte din konto til det rigtige tilbud.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {offers.map((offer) => (
                <article key={offer.id} className="hbkcc-soft-card flex flex-col p-7">
                  <h2 className="text-2xl font-bold">{offer.name}</h2>
                  <p className="mt-3 flex-1 text-[var(--text-muted)]">
                    {offer.description || "Åbn undervisningstilbuddet."}
                  </p>
                  <Link
                    href={`/dashboard?tilbud=${offer.slug}`}
                    className="hbkcc-primary-btn mt-6 text-center"
                  >
                    Fortsæt til {offer.name}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
