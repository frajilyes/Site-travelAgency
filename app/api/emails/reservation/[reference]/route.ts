import { requireUser } from '@/lib/dal';
import { bookingConfirmationEmail } from '@/lib/emails/booking-confirmation';
import { getBookingByReference } from '@/lib/queries/bookings';

/**
 * Renders the confirmation email exactly as it is sent, so the template can be
 * checked in a browser without an SMTP server. Same access rule as the booking
 * page: its owner, or an administrator.
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/emails/reservation/[reference]'>) {
  const { reference } = await ctx.params;
  const user = await requireUser();
  const booking = await getBookingByReference(reference.toUpperCase());

  if (!booking || (booking.user_id !== user.id && user.role !== 'admin')) {
    return new Response('Réservation introuvable.', { status: 404 });
  }

  const { html } = bookingConfirmationEmail(booking);
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
