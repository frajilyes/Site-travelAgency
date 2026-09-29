import 'server-only';
import { appUrl, type MailMessage } from '../mailer';
import { formatDate, formatDuration, formatLongDate, formatPrice, formatTime } from '../format';
import { CABIN_LABELS, type BookingDetail, type FlightDetail, type Passenger } from '../types';

const BRAND = '#2547eb';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';

const PASSENGER_TYPES: Record<Passenger['passenger_type'], string> = {
  adult: 'Adult',
  child: 'Child',
  infant: 'Infant',
};

function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paymentLabel(booking: BookingDetail): string {
  const payment = booking.payments.find((entry) => entry.status === 'paid') ?? booking.payments[0];
  if (!payment) return 'Payment recorded';
  if (payment.method === 'card') return `Card ••••${payment.card_last4 ?? '????'}`;
  return payment.method === 'paypal' ? 'PayPal' : 'Bank transfer';
}

function seatsFor(booking: BookingDetail, leg: 'outbound' | 'return'): string {
  const seats = booking.passengers
    .map((passenger) => (leg === 'outbound' ? passenger.seat_outbound : passenger.seat_return))
    .filter((seat): seat is string => Boolean(seat));
  return seats.length > 0 ? seats.join(', ') : 'On lap';
}

function segmentHtml(flight: FlightDetail, label: string, cabin: string, seats: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:10px;margin:0 0 16px;">
    <tr>
      <td style="padding:14px 20px;border-bottom:1px solid ${LINE};">
        <span style="font:600 11px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};">${esc(label)}</span>
        <span style="float:right;font:700 12px/1.4 'Courier New',monospace;color:${BRAND};">${esc(flight.flight_number)}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 20px;">
        <p style="margin:0 0 4px;font:700 18px/1.3 Arial,Helvetica,sans-serif;color:${INK};">
          ${esc(flight.origin_city)} &rarr; ${esc(flight.destination_city)}
        </p>
        <p style="margin:0 0 16px;font:400 13px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};">
          ${esc(formatLongDate(flight.departure_time))} &middot; ${esc(flight.airline_name)}
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="35%" style="font:400 13px/1.5 Arial,Helvetica,sans-serif;color:${INK};">
              <strong style="font-size:22px;">${esc(formatTime(flight.departure_time))}</strong><br />
              <strong>${esc(flight.origin_iata)}</strong><br />
              <span style="color:${MUTED};">${esc(flight.origin_name)}</span>
            </td>
            <td width="30%" align="center" style="font:400 12px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};">
              ${esc(formatDuration(flight.duration_minutes))}<br />
              <span style="color:${LINE};">&#9679;&mdash;&mdash;&mdash;&#9679;</span><br />
              Direct flight
            </td>
            <td width="35%" align="right" style="font:400 13px/1.5 Arial,Helvetica,sans-serif;color:${INK};">
              <strong style="font-size:22px;">${esc(formatTime(flight.arrival_time))}</strong><br />
              <strong>${esc(flight.destination_iata)}</strong><br />
              <span style="color:${MUTED};">${esc(flight.destination_name)}</span>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid ${LINE};">
          <tr>
            <td style="padding-top:12px;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
              Cabin <strong style="color:${INK};">${esc(cabin)}</strong> &nbsp;&middot;&nbsp;
              Seats <strong style="color:${INK};font-family:'Courier New',monospace;">${esc(seats)}</strong> &nbsp;&middot;&nbsp;
              Baggage <strong style="color:${INK};">${esc(flight.baggage_kg)} kg</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function segmentText(flight: FlightDetail, label: string, cabin: string, seats: string): string {
  return [
    `${label} — ${flight.flight_number} (${flight.airline_name})`,
    formatLongDate(flight.departure_time),
    `${formatTime(flight.departure_time)} ${flight.origin_iata} ${flight.origin_city} -> ${formatTime(flight.arrival_time)} ${flight.destination_iata} ${flight.destination_city} (${formatDuration(flight.duration_minutes)})`,
    `Cabin ${cabin} · Seats ${seats} · Baggage ${flight.baggage_kg} kg`,
  ].join('\n');
}

export function bookingConfirmationEmail(booking: BookingDetail): Omit<MailMessage, 'to'> {
  const cabin = CABIN_LABELS[booking.cabin_class];
  const link = `${appUrl()}/booking/${booking.reference}`;
  const route = `${booking.outbound.origin_city} → ${booking.outbound.destination_city}`;
  const subject = `Booking confirmed ${booking.reference} — ${route}`;
  const preheader = `${route} on ${formatDate(booking.outbound.departure_time)} · ${formatPrice(booking.total_price)} · reference ${booking.reference}`;

  const segments =
    segmentHtml(booking.outbound, 'Outbound flight', cabin, seatsFor(booking, 'outbound')) +
    (booking.returnFlight
      ? segmentHtml(booking.returnFlight, 'Return flight', cabin, seatsFor(booking, 'return'))
      : '');

  const passengerRows = booking.passengers
    .map(
      (passenger) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid ${LINE};font:400 13px/1.5 Arial,Helvetica,sans-serif;color:${INK};">
              ${esc(passenger.last_name.toUpperCase())} ${esc(passenger.first_name)}<br />
              <span style="color:${MUTED};font-size:12px;">Passport ${esc(passenger.passport_number)} &middot; ${esc(passenger.nationality)}</span>
            </td>
            <td align="right" style="padding:8px 0;border-bottom:1px solid ${LINE};font:400 13px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};">
              ${esc(PASSENGER_TYPES[passenger.passenger_type])}
            </td>
          </tr>`,
    )
    .join('');

  const priceRow = (label: string, value: string, strong = false) => `
          <tr>
            <td style="padding:6px 0;font:${strong ? '700 16px' : '400 13px'}/1.5 Arial,Helvetica,sans-serif;color:${strong ? INK : MUTED};">${esc(label)}</td>
            <td align="right" style="padding:6px 0;font:${strong ? '700 16px' : '400 13px'}/1.5 Arial,Helvetica,sans-serif;color:${INK};">${esc(value)}</td>
          </tr>`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${esc(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:${BRAND};padding:20px 24px;">
                <span style="font:700 18px/1.2 Arial,Helvetica,sans-serif;color:#ffffff;">SkyRoute</span>
                <span style="float:right;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#c7d6ff;">E-ticket</span>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 24px 8px;">
                <h1 style="margin:0 0 8px;font:700 24px/1.3 Arial,Helvetica,sans-serif;color:${INK};">
                  Your booking is confirmed
                </h1>
                <p style="margin:0 0 20px;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
                  Hello ${esc(booking.customer.first_name)}, your payment went through.
                  Present the reference below and photo ID at check-in.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4ff;border-radius:10px;">
                  <tr>
                    <td align="center" style="padding:18px;">
                      <p style="margin:0 0 6px;font:600 11px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};">
                        Booking reference
                      </p>
                      <p style="margin:0;font:700 30px/1.2 'Courier New',monospace;letter-spacing:.2em;color:${BRAND};">
                        ${esc(booking.reference)}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 24px 0;">${segments}</td>
            </tr>

            <tr>
              <td style="padding:0 24px;">
                <h2 style="margin:0 0 4px;font:700 15px/1.4 Arial,Helvetica,sans-serif;color:${INK};">
                  Passengers (${booking.passengers.length})
                </h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${passengerRows}</table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px;">
                <h2 style="margin:0 0 4px;font:700 15px/1.4 Arial,Helvetica,sans-serif;color:${INK};">Payment</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${priceRow('Flight fares', formatPrice(booking.base_price))}
                  ${priceRow('Taxes and charges', formatPrice(booking.taxes))}
                  ${priceRow('Total paid', formatPrice(booking.total_price), true)}
                  ${priceRow('Payment method', paymentLabel(booking))}
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
                  <tr>
                    <td style="background:${BRAND};border-radius:8px;">
                      <a href="${esc(link)}" style="display:inline-block;padding:13px 26px;font:700 14px/1 Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;">
                        View my booking
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:16px 0 0;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
                  Check-in closes 45 minutes before departure. Cancel online: full refund more
                  than 7 days before departure, 50% between 7 days and 24 hours, none after
                  that.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 24px 26px;border-top:1px solid ${LINE};">
                <p style="margin:0 0 6px;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
                  This email was sent to ${esc(booking.contact_email)} for booking
                  ${esc(booking.reference)}. If you cannot find it, remember to check your junk
                  mail (spam) folder.
                </p>
                <p style="margin:0;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
                  SkyRoute &middot; <a href="${esc(appUrl())}/help" style="color:${BRAND};text-decoration:none;">Help</a>
                  &middot; <a href="${esc(appUrl())}/terms" style="color:${BRAND};text-decoration:none;">Terms and conditions</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    'SkyRoute — your booking is confirmed',
    '',
    `Hello ${booking.customer.first_name}, your payment went through.`,
    `Booking reference: ${booking.reference}`,
    '',
    segmentText(booking.outbound, 'Outbound flight', cabin, seatsFor(booking, 'outbound')),
    ...(booking.returnFlight
      ? ['', segmentText(booking.returnFlight, 'Return flight', cabin, seatsFor(booking, 'return'))]
      : []),
    '',
    `Passengers (${booking.passengers.length}):`,
    ...booking.passengers.map(
      (passenger) =>
        `- ${passenger.last_name.toUpperCase()} ${passenger.first_name} (${PASSENGER_TYPES[passenger.passenger_type]}) — passport ${passenger.passport_number}`,
    ),
    '',
    `Flight fares: ${formatPrice(booking.base_price)}`,
    `Taxes and charges: ${formatPrice(booking.taxes)}`,
    `Total paid: ${formatPrice(booking.total_price)} (${paymentLabel(booking)})`,
    '',
    `View my booking: ${link}`,
    '',
    'Check-in closes 45 minutes before departure.',
    `This email was sent to ${booking.contact_email}. If you cannot find it, check your junk mail (spam) folder.`,
  ].join('\n');

  return { subject, html, text };
}
