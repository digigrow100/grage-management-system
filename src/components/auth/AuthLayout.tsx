import type { ReactNode } from "react";
import Image from "next/image";
import { CalendarDays, FileText, Settings, Wrench } from "lucide-react";

export default function AuthLayout({ children, title, description }: {
  children: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-950 lg:block" aria-label="Your workshop, organised">
        <Image src="/images/auth-workshop.webp" alt="" fill preload sizes="55vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/40 to-brand-950/10" />
        <div className="absolute inset-x-0 bottom-0 p-10 xl:p-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-blue-200">My Garage CRM</p>
          <h2 className="max-w-lg text-5xl font-semibold leading-[1.08] tracking-tight text-white xl:text-6xl">Ready for<br />the next job.</h2>
          <p className="mt-5 text-lg text-slate-200">Simple tools for a busy garage.</p>
          <div className="mt-10 flex gap-8 text-white xl:gap-12">
            {[{ icon: CalendarDays, label: "Bookings" }, { icon: Wrench, label: "Jobs" }, { icon: FileText, label: "Invoices" }].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col gap-3 border-r border-white/20 pr-8 last:border-0 last:pr-0 xl:pr-12">
                <Icon size={28} strokeWidth={1.5} className="text-blue-200" aria-hidden="true" />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="w-full max-w-sm">
          <div className="mb-12">
            <Settings size={42} className="mb-5 text-accent-600" aria-hidden="true" />
            <p className="text-2xl font-semibold tracking-tight text-brand-950">My Garage CRM</p>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-950">{title}</h1>
          <p className="mb-8 mt-3 text-sm leading-6 text-slate-500">{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
