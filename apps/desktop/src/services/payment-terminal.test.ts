import { afterEach, describe, expect, it } from 'bun:test'
import {
  amountToCents,
  buildPaymentConcept,
  chargeWithTerminal,
  orderNumberFromId,
  simulateTerminalPayment,
} from './payment-terminal'

type CapacitorGlobal = { Capacitor?: { Plugins?: Record<string, unknown> } }

afterEach(() => {
  delete (globalThis as CapacitorGlobal).Capacitor
})

describe('payment terminal', () => {
  it('approves via the simulated stub when no native plugin is present', async () => {
    const result = await chargeWithTerminal({ amountCents: 3050, orderNumber: 'OP000001', description: 'x' })
    expect(result.status).toBe('approved')
    expect(simulateTerminalPayment({ amountCents: 1, orderNumber: 'OP1', description: 'x' }).status).toBe('approved')
  })

  it('routes to the native plugin when present and passes it through', async () => {
    let received: unknown = null
    ;(globalThis as CapacitorGlobal).Capacitor = {
      Plugins: {
        BbvaTpv: {
          charge: async (request: unknown) => {
            received = request
            return { status: 'declined', rawMessage: 'card declined' }
          },
        },
      },
    }
    const request = { amountCents: 500, orderNumber: 'OP000002', description: 'concept' }
    const result = await chargeWithTerminal(request)
    expect(result.status).toBe('declined')
    expect(received).toEqual(request)
  })

  it('reports an error when the native plugin throws', async () => {
    ;(globalThis as CapacitorGlobal).Capacitor = {
      Plugins: {
        BbvaTpv: {
          charge: async () => {
            throw new Error('terminal offline')
          },
        },
      },
    }
    const result = await chargeWithTerminal({ amountCents: 100, orderNumber: 'OP1', description: 'x' })
    expect(result.status).toBe('error')
    expect(result.rawMessage).toContain('terminal offline')
  })

  it('converts amounts to cents', () => {
    expect(amountToCents(30.5)).toBe(3050)
    expect(amountToCents(9.99)).toBe(999)
  })

  it('derives a unique alphanumeric order number', () => {
    expect(orderNumberFromId('42')).toBe('OP000042')
  })

  it('fills the concept template with store, order, items and thank-you', () => {
    const concept = buildPaymentConcept({
      storeName: 'My Shop',
      orderNumber: 'OP000042',
      itemsSummary: '2x Coffee',
      thankYou: 'Thank you!',
      template: '{store} #{order}: {items} — {thanks}',
    })
    expect(concept).toBe('My Shop #OP000042: 2x Coffee — Thank you!')
  })

  it('truncates an overly long concept', () => {
    const concept = buildPaymentConcept({
      storeName: 'S'.repeat(400),
      orderNumber: 'OP1',
      itemsSummary: '',
      thankYou: '',
      template: '{store}',
    })
    expect(concept.length).toBeLessThanOrEqual(250)
    expect(concept.endsWith('…')).toBe(true)
  })
})
