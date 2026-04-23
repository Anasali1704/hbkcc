"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const userId = data.user?.id;

      if (userId) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userId,
          email,
          full_name: fullName,
          phone,
          role: "student",
        });

        if (profileError) {
          setMessage(profileError.message);
          setLoading(false);
          return;
        }
      }

      setMessage("Bruger oprettet. Du kan nu logge ind.");
      setMode("login");
      setFullName("");
      setPhone("");
      setEmail("");
      setPassword("");
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#f6f3ef]">
      <div className="mx-auto grid min-h-screen max-w-[1500px] gap-10 px-6 py-10 lg:grid-cols-[1.08fr_520px] lg:items-center">
        <section className="hidden lg:block">
          <div className="rounded-[30px] border border-stone-200 bg-white p-10 shadow-sm">
            <div className="relative h-[230px] w-full max-w-[760px]">
              <Image
                src="/logos/hbkcc-full.png"
                alt="HBKCC"
                fill
                className="object-contain object-centre"
                sizes="1520px"
                priority
              />
            </div>

            <div className="mt-10 max-w-2xl">
              <div className="mb-4 inline-flex rounded-full bg-[#f3e4e1] px-4 py-2 text-sm font-semibold text-[#8f1d22]">
                HBKCC Undervisning
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-stone-900">
                Velkommen til HBKCC - Pre Mahaad
              </h1>

              <p className="mt-5 text-xl leading-9 text-stone-600">
                "Whoever follows a path in search of knowledge, Allah will make his path easy for him to Paradise" 
                - Prophet Muhammad (PBUH)
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="rounded-[30px] border border-stone-200 bg-white p-8 shadow-sm md:p-10">
            <div className="mb-8 lg:hidden">
              <div className="relative h-[90px] w-full">
                <Image
                  src="/logos/hbkcc-full.png"
                  alt="HBKCC"
                  fill
                  className="object-contain"
                  sizes="320px"
                />
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-bold text-stone-900">
                HBKCC Undervisning
              </h2>
              <p className="mt-2 text-sm text-stone-500">
                Log ind på Pre Mahaad platformen
              </p>
            </div>

            <div className="mb-7 flex gap-2 rounded-2xl bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-xl px-4 py-2.5 font-semibold transition ${
                  mode === "login"
                    ? "bg-[#8f1d22] text-white shadow-sm"
                    : "text-stone-800"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-xl px-4 py-2.5 font-semibold transition ${
                  mode === "signup"
                    ? "bg-[#8f1d22] text-white shadow-sm"
                    : "text-stone-800"
                }`}
              >
                Opret bruger
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "signup" && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-stone-900">
                      Fulde navn
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none focus:border-[#b7b47a] focus:ring-4 focus:ring-[#b7b47a]/15"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-stone-900">
                      Telefonnummer
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none focus:border-[#b7b47a] focus:ring-4 focus:ring-[#b7b47a]/15"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-900">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none focus:border-[#b7b47a] focus:ring-4 focus:ring-[#b7b47a]/15"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-900">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none focus:border-[#b7b47a] focus:ring-4 focus:ring-[#b7b47a]/15"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#8f1d22] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7f161b]"
              >
                {loading
                  ? "Arbejder..."
                  : mode === "login"
                  ? "Log ind"
                  : "Opret bruger"}
              </button>
            </form>

            {message && (
              <div className="mt-5 rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-700">
                {message}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}