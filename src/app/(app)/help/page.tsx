import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Mail, Phone } from "lucide-react";

const FAQS: { question: string; answer: string }[] = [
  {
    question: "How do I book a new job?",
    answer:
      "Go to Bookings and click \"New booking\". Fill in the customer, job type, date and an optional estimated price — a linked job card is created automatically on the Job Cards board.",
  },
  {
    question: "What's the difference between an estimate and an invoice?",
    answer:
      "An estimate is a quote sent before work is confirmed. From the Invoices page click \"New estimate\", and once the customer approves it, open the estimate and click \"Convert to Invoice\".",
  },
  {
    question: "How do I mark a part as low stock?",
    answer:
      "Low stock is automatic — a part shows a \"Reorder now\" badge on the Inventory page whenever its stock level drops to or below its reorder level, which you set when adding or editing the part.",
  },
  {
    question: "Can I change my garage's details on invoices?",
    answer:
      "Yes — go to Settings and update your garage name, address, VAT number and default VAT rate. These are used across new estimates and invoices.",
  },
  {
    question: "How do reminders work?",
    answer:
      "Reminders are simple follow-ups you set yourself (e.g. \"Call customer about MOT\"), optionally linked to a customer. They show as overdue once their due date passes, and you can tick them off from the Reminders page.",
  },
];

export default function HelpPage() {
  return (
    <>
      <TopBar title="Help & Support" subtitle="Common questions and how to get in touch" />
      <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        <Card>
          <CardHeader title="Frequently asked questions" />
          <CardBody className="space-y-5">
            {FAQS.map((faq) => (
              <div key={faq.question}>
                <p className="text-sm font-medium text-slate-900">{faq.question}</p>
                <p className="mt-1 text-sm text-slate-500">{faq.answer}</p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Still need help?" subtitle="Reach out to support" />
          <CardBody className="space-y-3">
            <a
              href="mailto:support@mygarage.example"
              className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Mail size={16} className="text-accent-600" /> support@mygarage.example
            </a>
            <a
              href="tel:+441234567890"
              className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Phone size={16} className="text-accent-600" /> +44 1234 567890
            </a>
          </CardBody>
        </Card>
      </main>
    </>
  );
}
