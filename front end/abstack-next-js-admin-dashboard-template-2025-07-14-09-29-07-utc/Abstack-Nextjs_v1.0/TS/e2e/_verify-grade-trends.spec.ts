import { test, expect } from '@playwright/test'

test('grade trends page now defaults to the real term with real data', async ({ page }) => {
  await page.goto('http://localhost:5001/auth/login')
  await page.getByLabel(/email/i).fill('sectionhead@sims.edu.lk')
  await page.locator('#password').fill('secret')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/section-head**', { timeout: 20000 })

  await page.goto('http://localhost:5001/teacher/grade-trends')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: 'e2e/_gt-1-sectionhead.png', fullPage: true })

  const subjectClassSelect = page.locator('select').nth(1)
  const optionCount = await subjectClassSelect.locator('option').count()
  console.log('sectionhead Subject/Class option count:', optionCount)
})

test('grade trends page works for teacher2', async ({ page }) => {
  await page.goto('http://localhost:5001/auth/login')
  await page.getByLabel(/email/i).fill('teacher2@gmail.com')
  await page.locator('#password').fill('secret')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/section-head**', { timeout: 20000 })

  await page.goto('http://localhost:5001/teacher/grade-trends')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: 'e2e/_gt-2-teacher2.png', fullPage: true })

  const subjectClassSelect = page.locator('select').nth(1)
  const optionCount = await subjectClassSelect.locator('option').count()
  console.log('teacher2 Subject/Class option count:', optionCount)
})
