import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route(/\/auth\/v1\//, async (route) => {
    const url = route.request().url()
    if (url.includes('grant_type=password')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'mock-refresh',
          user: {
            id: 'test-user',
            email: 'test@test.com',
            aud: 'authenticated',
            role: 'authenticated',
            email_confirmed_at: new Date().toISOString(),
            app_metadata: { provider: 'email' },
            user_metadata: { name: 'Test User' },
            created_at: new Date().toISOString(),
          },
        }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user',
          email: 'test@test.com',
          aud: 'authenticated',
          role: 'authenticated',
        }),
      })
    }
  })

  await page.route(/\/rest\/v1\/profiles/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'test-user', name: 'Test User', is_admin: false }]),
    })
  })

  // Mock profile_scores
  await page.route(/\/rest\/v1\/profile_scores/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ user_id: 'test-user', crowns: 5, clowns: 2 }]),
    })
  })

  // Mock expert_thresholds
  await page.route(/\/rest\/v1\/expert_thresholds/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { tier: 'Bronze', min_reactions: 5, can_propose: false, vote_power: 1 },
        { tier: 'Silver', min_reactions: 20, can_propose: true, vote_power: 1 },
        { tier: 'Gold', min_reactions: 50, can_propose: true, vote_power: 2 },
        { tier: 'Platinum', min_reactions: 100, can_propose: true, vote_power: 3 },
      ]),
    })
  })

  await page.route(/\/rest\/v1\/challenge_entries/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route(/\/rest\/v1\/challenge_awards/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route(/\/rest\/v1\/reactions/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route(/\/rest\/v1\/comments/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
})

test.describe('Challenges', () => {
  test('challenges page loads and shows active challenge', async ({ page }) => {
    await page.route(/\/rest\/v1\/challenges/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '11111111-1111-1111-1111-111111111111',
            title: 'На велике — больше всех!',
            description: 'Кто проедет больше километров на велосипеде?',
            created_by: 'admin-id',
            starts_at: '2026-05-27T00:00:00Z',
            ends_at: '2026-06-03T00:00:00Z',
            status: 'active',
            config: { awards: ['king'] },
            created_at: '2026-05-20T00:00:00Z',
          },
          {
            id: '22222222-2222-2222-2222-222222222222',
            title: 'Кино-марафон',
            description: 'Посмотри как можно больше фильмов за неделю!',
            created_by: 'admin-id',
            starts_at: '2026-05-13T00:00:00Z',
            ends_at: '2026-05-20T00:00:00Z',
            status: 'completed',
            config: { awards: ['king', 'clown'] },
            created_at: '2026-05-05T00:00:00Z',
          },
        ]),
      })
    })

    await page.goto('/login')
    await page.getByLabel('Email').fill('test@test.com')
    await page.getByLabel('Пароль').fill('password123')
    await page.getByRole('button', { name: 'Войти' }).click()

    await page.waitForURL(/.*feed/, { timeout: 5000 })

    await page.goto('/challenges')
    await expect(page.getByRole('heading', { name: 'Челленджи' })).toBeVisible()
    await expect(page.getByText('🔥 Активные')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'На велике — больше всех!' }).first()).toBeVisible()
    await expect(page.getByText('✅ Завершённые')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Кино-марафон' })).toBeVisible()
  })

  test('challenge detail page loads', async ({ page }) => {
    // Mock challenge detail query (single result via id filter)
    await page.route(/\/rest\/v1\/challenges/, async (route) => {
      const url = route.request().url()
      if (url.includes('id=eq')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '11111111-1111-1111-1111-111111111111',
            title: 'На велике — больше всех!',
            description: 'Кто проедет больше километров на велосипеде?',
            created_by: 'admin-id',
            starts_at: '2026-05-27T00:00:00Z',
            ends_at: '2026-06-03T00:00:00Z',
            status: 'active',
            config: { awards: ['king'] },
            created_at: '2026-05-20T00:00:00Z',
          }),
        })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      }
    })

    // Mock entries
    await page.route(/\/rest\/v1\/challenge_entries/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'e1', challenge_id: '11111111-1111-1111-1111-111111111111', user_id: 'test-user', claim_id: 'c1', title: 'Моя заявка', version: 1, is_current: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ]),
      })
    })

    // Mock linked live challenge claim. Challenge detail renders claim cards from achievements,
    // while challenge_entries only carries the challenge -> claim link.
    await page.route(/\/rest\/v1\/achievements/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'c1',
            user_id: 'test-user',
            category: 'other',
            title: 'Моя заявка',
            description: 'Тестовая заявка для челленджа',
            year: 2026,
            proof_type: 'none',
            proof_value: null,
            status: 'pending',
            rejection_reason: null,
            claim_angle: 'judge',
            meta: { challenge_id: '11111111-1111-1111-1111-111111111111', source: 'challenge_entry' },
            created_at: new Date().toISOString(),
          },
        ]),
      })
    })

    // Mock awards
    await page.route(/\/rest\/v1\/challenge_awards/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.goto('/login')
    await page.getByLabel('Email').fill('test@test.com')
    await page.getByLabel('Пароль').fill('password123')
    await page.getByRole('button', { name: 'Войти' }).click()

    await page.waitForURL(/.*feed/, { timeout: 5000 })

    await page.goto('/challenges/11111111-1111-1111-1111-111111111111')
    await expect(page.getByRole('heading', { name: 'На велике — больше всех!' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Заявки' })).toBeVisible()
    await expect(page.getByText('Моя заявка')).toBeVisible()
  })
})
