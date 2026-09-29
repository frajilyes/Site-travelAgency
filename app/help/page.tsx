import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help and FAQ',
  description:
    'Answers to the most common questions: booking, baggage, cancellation, refunds and travel documents.',
};

const FAQ = [
  {
    question: 'How do I book a flight?',
    answer:
      'Enter your departure point, destination and dates in the search engine, pick a flight, then fill in the passenger details. The booking is confirmed as soon as the payment goes through and you are given a six-character booking reference.',
  },
  {
    question: 'Do I need an account to book?',
    answer:
      'Yes. An account lets you find your tickets, print them and cancel online. Creating one takes less than a minute.',
  },
  {
    question: 'When are my seats assigned?',
    answer:
      'At the time of booking. Every passenger occupying a seat is given a seat number in the chosen cabin, shown on the e-ticket. Infants under 2 travel on an adult’s lap and do not occupy a seat.',
  },
  {
    question: 'How do I cancel and get a refund?',
    answer:
      'From your booking page, using the “Cancel booking” button. The refund is full up to 7 days before departure, 50% between 7 days and 24 hours, and nil within the 24 hours before the flight. The seats are put back on sale automatically.',
  },
  {
    question: 'What fares apply to children?',
    answer:
      'Children aged 2 to 11 get 25% off the adult fare. Infants under 2 pay 10% of the fare. Taxes and airport charges are still due for every passenger.',
  },
  {
    question: 'What does the displayed price include?',
    answer:
      'The flight fare, 12% taxes and €22 of airport charges per passenger per segment. The exact total is broken down before payment, with no fees added afterwards.',
  },
  {
    question: 'Which documents do I have to present?',
    answer:
      'A valid passport for every passenger, plus any visa that may be required. Each country page in the Destinations section lists the entry requirements.',
  },
  {
    question: 'My flight was cancelled by the airline — what happens now?',
    answer:
      'The flight status changes to “cancelled” and customer service contacts you to rebook or to arrange a full refund, free of charge.',
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Help and frequently asked questions</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Everything you need to know before, during and after your booking.
      </p>

      <div className="mt-8 space-y-3">
        {FAQ.map((entry) => (
          <details key={entry.question} className="card p-5">
            <summary className="cursor-pointer font-semibold">{entry.question}</summary>
            <p className="mt-3 text-sm text-ink-muted">{entry.answer}</p>
          </details>
        ))}
      </div>

      <section className="card mt-8 p-6">
        <h2 className="text-lg font-semibold">Need to speak to an adviser?</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Our customer service team is available Monday to Saturday, 8 am to 8 pm (Paris time).
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>Phone: +33 1 84 88 20 30</li>
          <li>Email: contact@skyroute.fr</li>
          <li>Address: 18 rue de la Paix, 75002 Paris, France</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/help/baggage" className="btn btn-ghost">
            Baggage rules
          </Link>
          <Link href="/terms" className="btn btn-ghost">
            Terms of sale
          </Link>
        </div>
      </section>
    </div>
  );
}
