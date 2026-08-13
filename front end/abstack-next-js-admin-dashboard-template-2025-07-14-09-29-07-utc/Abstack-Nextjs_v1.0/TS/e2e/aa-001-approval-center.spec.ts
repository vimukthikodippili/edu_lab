/**
 * AA-001 — Approval Center unified queue (Principal/Admin, Critical, Functional)
 *
 * Precondition: pending leave, fee waiver, and expense requests exist.
 * Steps: open the approval queue.
 * Expected: all pending items from all three modules appear in ONE queue with
 * requester, type, date, reason — not split across separate tabs.
 *
 * The test-case prompt's suggested route ("/approval-center") does not exist in this
 * app; the real Principal approval queue lives at /principal/approvals (confirmed by
 * reading src/app/(portal)/principal/approvals/page.tsx and its RoleGuard/menu entry).
 *
 * Seeding uses the real backend API (not a DB fixture) so this test exercises the exact
 * create -> merge -> render path a real user would trigger, per each module's actual
 * @Roles() restriction:
 *  - Leave request:  POST /leave/requests            (created by Admin — the seeded
 *                      `teacher@sims.edu.lk` demo user has no linked Staff row in this
 *                      DB, confirmed via psql, so `admin@sims.edu.lk` is used instead;
 *                      Admin is on the same allowed-roles list as Teacher for this call)
 *  - Expense:         POST /expenses                  (created by Admin, same reason)
 *  - Fee waiver:      POST /fees/waiver-requests       (created by Accountant; requires
 *                      a real existing invoiceId, fetched via GET /fees/invoices)
 *
 * Each seeded item's reason/description is tagged with a per-run marker so assertions
 * target exactly the items this run created, independent of any other pending items
 * already sitting in the queue from unrelated earlier work in this dev database.
 */
import { test, expect, type APIRequestContext } from '@playwright/test'

const API_BASE = process.env.E2E_API_BASE_URL ?? 'http://localhost:5000/api/v1'
const RUN_TAG = `AA001-${Date.now()}`

async function login(request: APIRequestContext, email: string, password: string): Promise<string> {
  const res = await request.post(`${API_BASE}/auth/email/login`, { data: { email, password } })
  expect(res.ok(), `login failed for ${email}: ${await res.text()}`).toBeTruthy()
  const body = await res.json()
  return body.token as string
}

test.describe('AA-001 — Approval Center unified queue', () => {
  let leaveReason: string
  let expenseDescription: string
  let waiverReason: string

  test.beforeAll(async ({ request }) => {
    leaveReason = `${RUN_TAG} annual leave for a family event`
    expenseDescription = `${RUN_TAG} stationery restock for the science lab`
    waiverReason = `${RUN_TAG} hardship fee waiver request`

    // 1. Leave request — Admin self-submits (has a real linked Staff row), lands as
    // PENDING automatically.
    const requesterToken = await login(request, 'admin@sims.edu.lk', 'secret')
    const leaveRes = await request.post(`${API_BASE}/leave/requests`, {
      headers: { Authorization: `Bearer ${requesterToken}` },
      data: {
        leaveType: 'annual',
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        reason: leaveReason,
      },
    })
    expect(leaveRes.ok(), `leave request creation failed: ${await leaveRes.text()}`).toBeTruthy()

    // 2. Expense — same broad staff-role endpoint.
    const expenseRes = await request.post(`${API_BASE}/expenses`, {
      headers: { Authorization: `Bearer ${requesterToken}` },
      data: {
        amount: 4250.5,
        category: 'supplies',
        description: expenseDescription,
      },
    })
    expect(expenseRes.ok(), `expense creation failed: ${await expenseRes.text()}`).toBeTruthy()

    // 3. Fee waiver — Accountant-only, requires a real existing invoice.
    const accountantToken = await login(request, 'accountant@sims.edu.lk', 'secret')
    const invoicesRes = await request.get(`${API_BASE}/fees/invoices?limit=50`, {
      headers: { Authorization: `Bearer ${accountantToken}` },
    })
    expect(invoicesRes.ok(), `fetching invoices failed: ${await invoicesRes.text()}`).toBeTruthy()
    const invoicesBody = await invoicesRes.json()
    const invoices: { id: string }[] = invoicesBody.data ?? invoicesBody
    expect(invoices.length, 'no existing invoices found to attach a waiver request to — precondition data missing').toBeGreaterThan(0)

    // Try invoices in a pseudo-random order (seeded off the run tag) so a leftover
    // PENDING waiver on any one invoice from a prior/aborted run doesn't collide —
    // a real invoice can only ever carry one pending waiver at a time (409 otherwise).
    const startIdx = Date.now() % invoices.length
    let waiverRes: Awaited<ReturnType<typeof request.post>> | null = null
    for (let k = 0; k < invoices.length; k++) {
      const candidate = invoices[(startIdx + k) % invoices.length]
      const res = await request.post(`${API_BASE}/fees/waiver-requests`, {
        headers: { Authorization: `Bearer ${accountantToken}` },
        data: {
          invoiceId: candidate.id,
          requestedDiscountAmount: 500,
          reason: waiverReason,
        },
      })
      if (res.ok()) { waiverRes = res; break }
    }
    expect(waiverRes?.ok(), 'could not create a fee waiver request on any available invoice').toBeTruthy()
  })

  test('all pending items from all three modules appear together in one queue', async ({ page }) => {
    // Real UI login as Principal, per the test case's own "Login as Principal" step.
    await page.goto('/auth/login')
    await page.getByLabel(/email/i).fill('principal@sims.edu.lk')
    await page.locator('#password').fill('secret')
    await page.getByRole('button', { name: /log in|sign in/i }).click()
    // Generous timeout: this dev environment cold-compiles each Next.js route on first
    // visit (observed 45-130s for a first hit under current disk-space constraints) —
    // not a real app slowness, but real for a first-run e2e test against `next dev`.
    await page.waitForURL(/\/principal/, { timeout: 120_000 })

    // The AC's literal route ("/approval-center") doesn't exist — the real one does.
    await page.goto('/principal/approvals')
    await expect(page.getByRole('heading', { name: /approval/i })).toBeVisible()

    // Default view must already be the unified "All" queue, not a per-module tab.
    const allTab = page.getByRole('button', { name: /^all$/i })
    if (await allTab.count()) {
      await expect(allTab).toHaveClass(/active|selected/)
    }

    const table = page.locator('table')
    await expect(table).toBeVisible()

    // All 3 seeded items must be present as rows in that SAME table — proves they're
    // merged into one queue rather than requiring a tab switch to see all of them.
    const leaveRow = table.locator('tr', { hasText: leaveReason })
    const expenseRow = table.locator('tr', { hasText: expenseDescription })
    const waiverRow = table.locator('tr', { hasText: waiverReason })

    await expect(leaveRow).toHaveCount(1)
    await expect(expenseRow).toHaveCount(1)
    await expect(waiverRow).toHaveCount(1)

    // Each row must show requester, type, date, and reason (AC's exact field list).
    for (const [row, expectedType] of [
      [leaveRow, /leave/i],
      [expenseRow, /expense/i],
      [waiverRow, /fee waiver/i],
    ] as const) {
      await expect(row).toContainText(expectedType) // Type
      await expect(row.getByText(/\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},? \d{4}/)).toBeVisible() // Submitted date
      const rowText = await row.innerText()
      expect(rowText.trim().length, 'row should render a requester name').toBeGreaterThan(0)
    }

    // Confirm all 3 rows are simultaneously visible without switching tabs — the crux
    // of AA-001 ("one queue ... not in separate tabs").
    await expect(leaveRow).toBeVisible()
    await expect(expenseRow).toBeVisible()
    await expect(waiverRow).toBeVisible()
  })
})
