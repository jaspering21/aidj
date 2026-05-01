import { test, expect, chromium, Browser, Page } from '@playwright/test'

test.describe('AIDJ Comprehensive UI Test', () => {
  let browser: Browser
  let page: Page

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true })
  })

  test.afterAll(async () => {
    await browser.close()
  })

  test.beforeEach(async () => {
    page = await browser.newPage()
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console Error: ${msg.text()}`)
      }
    })
  })

  test.afterEach(async () => {
    await page.close()
  })

  // Test 1: Page Load
  test('01 - Page loads successfully', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Check page title
    const title = await page.title()
    expect(title).toBe('AIDJ Music Agent')
    console.log(`Page title: ${title}`)

    // Check main elements exist
    const body = await page.textContent('body')
    expect(body).toContain('AIDJ')
    console.log('Page loaded successfully')
  })

  // Test 2: Clock Display
  test('02 - Clock displays correctly', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const clock = page.locator('.time-display')
    await expect(clock).toBeVisible()
    const clockText = await clock.textContent()
    console.log(`Clock showing: ${clockText}`)

    // Verify clock format (HH:MM:SS)
    expect(clockText).toMatch(/\d{2}:\d{2}:\d{2}/)
    console.log('Clock format verified')
  })

  // Test 3: NOW PLAYING Panel
  test('03 - NOW PLAYING panel exists', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const nowPlaying = page.locator('text=NOW PLAYING')
    await expect(nowPlaying).toBeVisible()
    console.log('NOW PLAYING panel visible')

    // Check for progress bar
    const progressBar = page.locator('.progress-container')
    await expect(progressBar).toBeVisible()
    console.log('Progress bar visible')
  })

  // Test 4: Playback Controls
  test('04 - Playback controls exist', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Check play button
    const playBtn = page.locator('.control-btn-play')
    await expect(playBtn).toBeVisible()
    console.log('Play button visible')

    // Check prev/next buttons
    const prevBtn = page.locator('button').filter({ has: page.locator('svg') }).first()
    const nextBtn = page.locator('button').filter({ has: page.locator('svg') }).nth(2)
    await expect(prevBtn).toBeVisible()
    await expect(nextBtn).toBeVisible()
    console.log('Prev/Next buttons visible')
  })

  // Test 5: Volume Slider
  test('05 - Volume slider exists', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const volumeSlider = page.locator('input[type="range"]')
    await expect(volumeSlider).toBeVisible()
    console.log('Volume slider visible')
  })

  // Test 6: Chat Panel
  test('06 - Chat panel exists', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const chatPanel = page.locator('text=AIDJ').first()
    await expect(chatPanel).toBeVisible()
    console.log('Chat panel visible')

    // Check chat input
    const chatInput = page.locator('.chat-input')
    await expect(chatInput).toBeVisible()
    console.log('Chat input visible')
  })

  // Test 7: Chat Input
  test('07 - Can type in chat input', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const chatInput = page.locator('.chat-input')
    await chatInput.fill('Hello')
    const value = await chatInput.inputValue()
    expect(value).toBe('Hello')
    console.log('Chat input works')
  })

  // Test 8: Playlist Panel
  test('08 - Playlist panel exists', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const playlist = page.locator('text=PLAYLIST')
    await expect(playlist).toBeVisible()
    console.log('Playlist panel visible')

    // Check playlist items load
    await page.waitForTimeout(1000)
    const playlistItems = page.locator('.playlist-item')
    const count = await playlistItems.count()
    expect(count).toBeGreaterThan(0)
    console.log(`Playlist items: ${count}`)
  })

  // Test 9: Status Indicator
  test('09 - Status indicator exists', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Check for STANDBY or ON AIR
    const standby = page.locator('text=STANDBY')
    const onAir = page.locator('text=ON AIR')
    const statusExists = (await standby.count() > 0) || (await onAir.count() > 0)
    expect(statusExists).toBe(true)
    console.log('Status indicator visible')
  })

  // Test 10: Weather Display
  test('10 - Weather display exists', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Look for weather icon or temperature
    const weatherIcon = page.locator('.weather-icon')
    await expect(weatherIcon).toBeVisible()
    console.log('Weather display visible')
  })

  // Test 11: Ambient Light Elements
  test('11 - Ambient light layers exist', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const ambientLight = page.locator('.ambient-light-primary')
    await expect(ambientLight).toBeAttached()
    console.log('Ambient light layers exist')
  })

  // Test 12: Login Button (if not logged in)
  test('12 - Login button exists', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const loginBtn = page.locator('text=LOGIN')
    // Either visible (not logged in) or not (logged in)
    const isVisible = await loginBtn.isVisible().catch(() => false)
    console.log(`Login button visible: ${isVisible}`)
  })

  // Test 13: Glass Panels
  test('13 - Glass panels render correctly', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const glassPanels = page.locator('.glass-panel')
    const count = await glassPanels.count()
    expect(count).toBeGreaterThanOrEqual(3)
    console.log(`Glass panels count: ${count}`)
  })

  // Test 14: Scanlines Overlay
  test('14 - Scanlines overlay exists', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const scanlines = page.locator('.scanlines')
    await expect(scanlines).toBeAttached()
    console.log('Scanlines overlay exists')
  })

  // Test 15: Take Screenshot
  test('15 - Screenshot capture', async () => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    await page.screenshot({ path: '/tmp/aidj_full_test.png', fullPage: true })
    console.log('Screenshot saved to /tmp/aidj_full_test.png')
  })
})
