/**
 * ui-deepseek-billing plugin halves: the browser entry's dictionary and
 * header-slot registrations against the real SlotRegistry (with fiber
 * teardown proving removal — HMR safety), the inert node entry, and the
 * invariant companion's ownership reservation.
 */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as applyLocale, inject as localeInject } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as applyNode, priceUsage } from '../src/index.ts'
import * as BillingInvariant from '../src/invariant.ts'
import { en, NS, zh } from '../src/client/locales.ts'

/** Slot ledger reader: entry ids currently registered in one slot. */
function entryIds(ctx: Context, slot: string): (string | undefined)[] {
  return ctx.slots
    .entries(slot)
    .map(entry => entry.options.id)
}

/** Boot the browser half over a real slot tree that declares both slots. */
async function bench(): Promise<{ ctx: Context; fiber: ReturnType<Context['plugin']> }> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'conversation.session.header.actions': { kind: 'list', scope: 'session' },
      'conversation.composer.stats.extra': { kind: 'list', scope: 'session' },
    },
  } as never, () => null)
  ctx.provide('sessions', {})
  // The locale plugin binds a settings scope, which reads the connection handle
  // and the forwarded-event port.
  ctx.provide('connection', { api: { settings: {} }, isLoopback: false } as never)
  ctx.provide('remote', { $on: () => () => {} } as never)
  ctx.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  await ctx.plugin({ inject: localeInject, apply: applyLocale }).await()
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber }
}

describe('ui-deepseek-billing browser half', () => {
  it('declares the services it binds', () => {
    expect(inject).toEqual(['sessions', 'slots', 'locale'])
  })

  it('registers the header action and the stats-strip group, and fiber teardown removes both (HMR safety)', async () => {
    const { ctx, fiber } = await bench()
    expect(entryIds(ctx, 'conversation.session.header.actions')).toContain('deepseek-billing')
    expect(entryIds(ctx, 'conversation.composer.stats.extra')).toContain('billing-cost')
    await fiber.dispose()
    expect(entryIds(ctx, 'conversation.session.header.actions')).not.toContain('deepseek-billing')
    expect(entryIds(ctx, 'conversation.composer.stats.extra')).not.toContain('billing-cost')
  })

  it('registers both dictionaries under its own namespace and releases them with the fiber', async () => {
    const { ctx, fiber } = await bench()
    const translate = ctx.locale.bind(NS)
    expect(translate('trigger.aria')).toBe(zh['trigger.aria'])
    ctx.locale.setLocale('en')
    expect(translate('trigger.aria')).toBe(en['trigger.aria'])

    // Withdrawn dictionaries leave the key unresolved rather than translated.
    await fiber.dispose()
    expect(translate('trigger.aria')).not.toBe(en['trigger.aria'])
  })

  it('keeps the English dictionary key-identical to the Chinese source of truth', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })
})

describe('ui-deepseek-billing node half', () => {
  it('contributes no host behavior but exports the pricing module', () => {
    // The node half exists so the plugin appears in the Loader tree.
    expect(applyNode).not.toThrow()
    expect(typeof priceUsage).toBe('function')
  })
})

describe('ui-deepseek-billing invariant companion', () => {
  it('reserves package ownership under its declared companion name', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(BillingInvariant)
    await fiber.await()
    expect(BillingInvariant.name).toBe('client-ui-deepseek-billing-invariant')
    expect(BillingInvariant.inject).toEqual(['invariants'])
    // Emitting an unrelated event proves the companion installed no audit.
    expect(() => { (ctx.emit as (event: string) => void)('slots/changed') }).not.toThrow()
    await fiber.dispose()
  })
})
