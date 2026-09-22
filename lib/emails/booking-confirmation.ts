import 'server-only';
import { appUrl, type MailMessage } from '../mailer';
import { formatDate, formatDuration, formatLongDate, formatPrice, formatTime } from '../format';
import { CABIN_LABELS, type BookingDetail, type FlightDetail, type Passenger } from '../types';

const BRAND = '#2547eb';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';

const PASSENGER_TYPES: Record<Passenger['passenger_type'], string> = {
  adult: 'Adulte',
  child: 'Enfant',
  infant: 'Bébé',
};

/** Escape everything that comes from the database before it reaches the HTML. */
function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paymentLabel(booking: BookingDetail): string {
  const payment = booking.payments.find((entry) => entry.status === 'paid') ?? booking.payments[0];
  if (!payment) return 'Paiement enregistré';
  if (payment.method === 'card') return `Carte ••••${payment.card_last4 ?? '????'}`;
  return payment.method === 'paypal' ? 'PayPal' : 'Virement bancaire';
}

function seatsFor(booking: BookingDetail, leg: 'outbound' | 'return'): string {
  const seats = booking.passengers
    .map((passenger) => (leg === 'outbound' ? passenger.seat_outbound : passenger.seat_return))
    .filter((seat): seat is string => Boolean(seat));
  return seats.length > 0 ? seats.join(', ') : 'Sur les genoux';
}

/**
 * One flight leg. Built from nested tables with inline styles because Gmail and
 * Outlook drop stylesheets, flexbox and grid.
 */
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
              Vol direct
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
              Cabine <strong style="color:${INK};">${esc(cabin)}</strong> &nbsp;&middot;&nbsp;
              Sièges <strong style="color:${INK};font-family:'Courier New',monospace;">${esc(seats)}</strong> &nbsp;&middot;&nbsp;
              Bagage <strong style="color:${INK};">${esc(flight.baggage_kg)} kg</strong>
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
    `Cabine ${cabin} · Sièges ${seats} · Bagage ${flight.baggage_kg} kg`,
  ].join('\n');
}

/** Subject, HTML and plain-text body of the e-ticket sent after a booking. */
export function bookingConfirmationEmail(booking: BookingDetail): Omit<MailMessage, 'to'> {
  const cabin = CABIN_LABELS[booking.cabin_class];
  const link = `${appUrl()}/reservation/${booking.reference}`;
  const route = `${booking.outbound.origin_city} → ${booking.outbound.destination_city}`;
  const subject = `Réservation confirmée ${booking.reference} — ${route}`;
  // Snippet Gmail shows next to the subject in the inbox list.
  const preheader = `${route} le ${formatDate(booking.outbound.departure_time)} · ${formatPrice(booking.total_price)} · dossier ${booking.reference}`;

  const segments =
    segmentHtml(booking.outbound, 'Vol aller', cabin, seatsFor(booking, 'outbound')) +
    (booking.returnFlight
      ? segmentHtml(booking.returnFlight, 'Vol retour', cabin, seatsFor(booking, 'return'))
      : '');

  const passengerRows = booking.passengers
    .map(
      (passenger) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid ${LINE};font:400 13px/1.5 Arial,Helvetica,sans-serif;color:${INK};">
              ${esc(passenger.last_name.toUpperCase())} ${esc(passenger.first_name)}<br />
              <span style="color:${MUTED};font-size:12px;">Passeport ${esc(passenger.passport_number)} &middot; ${esc(passenger.nationality)}</span>
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
<html lang="fr">
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
                <span style="float:right;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#c7d6ff;">Billet électronique</span>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 24px 8px;">
                <h1 style="margin:0 0 8px;font:700 24px/1.3 Arial,Helvetica,sans-serif;color:${INK};">
                  Votre réservation est confirmée
                </h1>
                <p style="margin:0 0 20px;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
                  Bonjour ${esc(booking.customer.first_name)}, votre paiement a bien été accepté.
                  Présentez la référence ci-dessous et une pièce d’identité à l’enregistrement.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4ff;border-radius:10px;">
                  <tr>
                    <td align="center" style="padding:18px;">
                      <p style="margin:0 0 6px;font:600 11px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};">
                        Référence de dossier
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
                  Passagers (${booking.passengers.length})
                </h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${passengerRows}</table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px;">
                <h2 style="margin:0 0 4px;font:700 15px/1.4 Arial,Helvetica,sans-serif;color:${INK};">Paiement</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${priceRow('Tarif des vols', formatPrice(booking.base_price))}
                  ${priceRow('Taxes et redevances', formatPrice(booking.taxes))}
                  ${priceRow('Total payé', formatPrice(booking.total_price), true)}
                  ${priceRow('Moyen de paiement', paymentLabel(booking))}
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
                  <tr>
                    <td style="background:${BRAND};border-radius:8px;">
                      <a href="${esc(link)}" style="display:inline-block;padding:13px 26px;font:700 14px/1 Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;">
                        Voir ma réservation
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:16px 0 0;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
                  L’enregistrement ferme 45 minutes avant le départ. Annulation en ligne :
                  remboursement intégral à plus de 7 jours du départ, 50 % entre 7 jours et
                  24 heures, aucun ensuite.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 24px 26px;border-top:1px solid ${LINE};">
                <p style="margin:0 0 6px;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
                  Cet email a été envoyé à ${esc(booking.contact_email)} pour la réservation
                  ${esc(booking.reference)}. Si vous ne le retrouvez pas, pensez à regarder dans
                  vos courriers indésirables (spam).
                </p>
                <p style="margin:0;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
                  SkyRoute &middot; <a href="${esc(appUrl())}/aide" style="color:${BRAND};text-decoration:none;">Aide</a>
                  &middot; <a href="${esc(appUrl())}/conditions" style="color:${BRAND};text-decoration:none;">Conditions générales</a>
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
    'SkyRoute — votre réservation est confirmée',
    '',
    `Bonjour ${booking.customer.first_name}, votre paiement a bien été accepté.`,
    `Référence de dossier : ${booking.reference}`,
    '',
    segmentText(booking.outbound, 'Vol aller', cabin, seatsFor(booking, 'outbound')),
    ...(booking.returnFlight
      ? ['', segmentText(booking.returnFlight, 'Vol retour', cabin, seatsFor(booking, 'return'))]
      : []),
    '',
    `Passagers (${booking.passengers.length}) :`,
    ...booking.passengers.map(
      (passenger) =>
        `- ${passenger.last_name.toUpperCase()} ${passenger.first_name} (${PASSENGER_TYPES[passenger.passenger_type]}) — passeport ${passenger.passport_number}`,
    ),
    '',
    `Tarif des vols : ${formatPrice(booking.base_price)}`,
    `Taxes et redevances : ${formatPrice(booking.taxes)}`,
    `Total payé : ${formatPrice(booking.total_price)} (${paymentLabel(booking)})`,
    '',
    `Voir ma réservation : ${link}`,
    '',
    'L’enregistrement ferme 45 minutes avant le départ.',
    `Cet email a été envoyé à ${booking.contact_email}. Si vous ne le retrouvez pas, regardez dans vos courriers indésirables (spam).`,
  ].join('\n');

  return { subject, html, text };
}
