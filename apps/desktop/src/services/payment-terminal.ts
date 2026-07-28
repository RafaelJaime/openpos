// Payment terminal abstraction.
//
// The POS calls chargeWithTerminal() when a sale is finalized. Delivery is
// backend-agnostic:
//   - Native (Phase 2): a Capacitor plugin `BbvaTpv` embedding the Redsys/BBVA
//     TPVV Android SDK, running on the BBVA "TPV Android" device. It maps to
//     TPVV.doDirectPayment(activity, orderNumber, amountCents, NORMAL, "",
//     description, callback) — hence amountCents + a free-text description.
//   - Web/desktop dev (Phase 1): a simulated stub so the whole finish-sale flow
//     is testable without the SDK or a real terminal.

export interface TerminalPaymentRequest {
  amountCents: number
  orderNumber: string
  description: string
}

export interface TerminalPaymentResult {
  status: 'approved' | 'declined' | 'cancelled' | 'error'
  authCode?: string
  reference?: string
  rawMessage?: string
}

export interface PaymentTerminalPlugin {
  charge(request: TerminalPaymentRequest): Promise<TerminalPaymentResult>
}

/** The native Capacitor plugin, present only inside the Android wrapper (Phase 2). */
export function getNativeTerminal(): PaymentTerminalPlugin | null {
  const capacitor = (globalThis as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor
  const plugin = capacitor?.Plugins?.BbvaTpv as PaymentTerminalPlugin | undefined
  return plugin && typeof plugin.charge === 'function' ? plugin : null
}

/** Phase 1 stub: approves so the sale flow can be exercised without a terminal. */
export function simulateTerminalPayment(request: TerminalPaymentRequest): TerminalPaymentResult {
  return {
    status: 'approved',
    authCode: 'SIMULATED',
    reference: request.orderNumber,
    rawMessage: 'Simulated approval (no payment terminal SDK installed)',
  }
}

export async function chargeWithTerminal(request: TerminalPaymentRequest): Promise<TerminalPaymentResult> {
  const native = getNativeTerminal()
  if (native) {
    try {
      return await native.charge(request)
    } catch (error) {
      return { status: 'error', rawMessage: error instanceof Error ? error.message : String(error) }
    }
  }
  return simulateTerminalPayment(request)
}

/** Redsys requires amounts in cents (e.g. 3050 = €30.50). */
export function amountToCents(total: number): number {
  return Math.round(total * 100)
}

/** A unique alphanumeric order reference for numeroDePedido. */
export function orderNumberFromId(id: string): string {
  const numeric = id.replace(/\D/g, '') || '0'
  return `OP${numeric.padStart(6, '0')}`.slice(0, 20)
}

// The SDK Descripcion is a bounded free-text field; keep the concept short.
const CONCEPT_MAX_LENGTH = 250

/** Build the payment concept = order title + description + thank-you. */
export function buildPaymentConcept(params: {
  storeName: string
  orderNumber: string
  itemsSummary: string
  thankYou: string
  template?: string | null
}): string {
  const template = params.template?.trim() || '{store} · {order} · {items} · {thanks}'
  const filled = template
    .replaceAll('{store}', params.storeName)
    .replaceAll('{order}', params.orderNumber)
    .replaceAll('{items}', params.itemsSummary)
    .replaceAll('{thanks}', params.thankYou)
    .replace(/\s+/g, ' ')
    .trim()
  return filled.length > CONCEPT_MAX_LENGTH ? `${filled.slice(0, CONCEPT_MAX_LENGTH - 1)}…` : filled
}
