import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and conditions of sale',
  description: 'Booking, payment, cancellation and refund conditions.',
};

const SECTIONS = [
  {
    title: '1. Purpose',
    body: 'These terms govern the sale of air travel tickets by SkyRoute, an online travel agency. Making a booking implies unreserved acceptance of them. SkyRoute acts as an intermediary between the traveller and the airline operating the flight.',
  },
  {
    title: '2. Booking',
    body: 'A booking becomes firm as soon as payment is confirmed. A six-character booking reference is issued and an e-ticket is made available in your account. Passenger names must match those on their travel documents exactly; any discrepancy may result in denied boarding.',
  },
  {
    title: '3. Prices and payment',
    body: 'Prices are quoted in euros, all taxes included. They cover the flight fare, 12% taxes and €22 of airport charges per passenger per segment. Children aged 2 to 11 receive a 25% discount on the fare, infants under 2 pay 10% of the fare and are not allocated a seat. Payment can be made by card, PayPal or bank transfer.',
  },
  {
    title: '4. Changes',
    body: 'Tickets cannot be changed online. Any request to change a date, a destination or a name must be sent to customer service, who will cancel the booking and create a new one at the fares available that day.',
  },
  {
    title: '5. Cancellation and refunds',
    body: 'Cancellations are made from your account. The refund is full if the cancellation is made more than 7 days before departure, 50% of the amount paid between 7 days and 24 hours before departure, and nil within the 24 hours before departure. Refunds are credited to the original payment method. Released seats are immediately put back on sale.',
  },
  {
    title: '6. Cancellation by the airline',
    body: 'If the airline cancels the flight, the traveller is refunded in full or rebooked on another flight free of charge, at their choice. Compensation rights under Regulation (EC) No 261/2004 continue to apply.',
  },
  {
    title: '7. Travel documents',
    body: 'Each passenger is responsible for holding a valid passport together with any visas and authorisations required by the destination country and any transit countries. SkyRoute provides this information as a guide and cannot be held liable for denied boarding caused by non-compliant documents.',
  },
  {
    title: '8. Baggage',
    body: 'Baggage allowances are shown on each flight’s details and repeated on the e-ticket. Oversized or excess baggage is subject to a supplement paid directly to the airline.',
  },
  {
    title: '9. Personal data',
    body: 'The data collected (identity, contact details, travel documents) is required to perform the contract of carriage and is kept for the statutory period. Travellers have a right of access, rectification and erasure, which they can exercise from their account or through customer service.',
  },
  {
    title: '10. Complaints and governing law',
    body: 'Any complaint must be sent to customer service within 30 days of the flight. These terms are governed by French law. Failing an amicable settlement, the French courts have jurisdiction.',
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Terms and conditions of sale</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Demonstration project — flights, payments and refunds are simulated in a local database.
      </p>

      <div className="mt-8 space-y-6">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-base font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
