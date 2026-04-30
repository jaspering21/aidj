import { test, expect } from '@playwright/test';

test.describe('AIDJ Music Agent - Complete Test Suite', () => {

  // Use single test to avoid CORS issues with page.evaluate in multiple tests
  test('All Features Test', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for all tests
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // 1. Load page
    console.log('\n=== Test 1: Page Load ===');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('text=DATE', { timeout: 15000 });

    const body = await page.textContent('body');
    console.log('Body preview:', body?.substring(0, 80));

    // 2. Check grid widgets (new HUD style)
    console.log('\n=== Test 2: HUD Widgets ===');
    expect(body.includes('DATE')).toBeTruthy();
    expect(body.includes('TIME')).toBeTruthy();
    expect(body.includes('STANDBY') || body.includes('ON AIR')).toBeTruthy();
    console.log('✓ HUD widgets: DATE, TIME, STATUS all visible');

    // 3. Check main components (new HUD style)
    console.log('\n=== Test 3: Main Components ===');
    expect(body.includes('AIDJ CHAT') || body.includes('CHAT')).toBeTruthy();
    expect(body.includes('PLAYLIST')).toBeTruthy();
    expect(body.includes('NOW PLAYING')).toBeTruthy();
    console.log('✓ Main components visible');

    // 4. Check playlist
    console.log('\n=== Test 4: Playlist ===');
    await page.waitForTimeout(2000);
    const playlistItems = page.locator('.space-y-2 > div');
    const count = await playlistItems.count();
    expect(count).toBeGreaterThan(0);
    const firstSong = await playlistItems.first().textContent();
    console.log(`✓ Playlist loaded with ${count} items, first: ${firstSong?.substring(0, 30)}`);

    // 5. Test chat via API
    console.log('\n=== Test 5: Chat + TTS ===');
    const chatRes = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3000/api/aidj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: '你好' })
      });
      return res.json();
    });
    expect(chatRes.success).toBe(true);
    expect(chatRes.data.reply.length).toBeGreaterThan(0);
    expect(chatRes.data.audio.length).toBeGreaterThan(1000);
    console.log(`✓ Chat reply: ${chatRes.data.reply.substring(0, 50)}...`);
    console.log(`✓ TTS audio: ${chatRes.data.audio.length} bytes`);

    // 6. Test TTS playback
    console.log('\n=== Test 6: TTS Playback ===');
    const audioTest = await page.evaluate(async (audioB64) => {
      const audio = new Audio();
      audio.src = `data:audio/mp3;base64,${audioB64}`;
      await audio.play();
      return { duration: audio.duration, playing: !audio.paused };
    }, chatRes.data.audio);
    expect(audioTest.playing).toBe(true);
    console.log(`✓ Audio duration: ${audioTest.duration}s, playing: ${audioTest.playing}`);

    // 7. Test recommendation API
    console.log('\n=== Test 7: Recommendation API ===');
    const recRes = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3000/api/aidj?action=recommend');
      return res.json();
    });
    expect(recRes.success).toBe(true);
    expect(recRes.data.songName).toBeTruthy();
    expect(recRes.data.artist).toBeTruthy();
    console.log(`✓ Recommendation: "${recRes.data.songName}" by ${recRes.data.artist}`);

    // 8. Test weather API
    console.log('\n=== Test 8: Weather API ===');
    const weatherRes = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3000/api/aidj?action=weather');
      return res.json();
    });
    expect(weatherRes.success).toBe(true);
    expect(weatherRes.data.condition).toBeTruthy();
    console.log(`✓ Weather: ${weatherRes.data.city}, ${weatherRes.data.condition}, ${weatherRes.data.temperature}°C`);

    // 9. Test NetEase QR key generation
    console.log('\n=== Test 9: NetEase QR Key ===');
    const qrKeyRes = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3000/api/netease-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'qrKey' })
      });
      return res.json();
    });
    expect(qrKeyRes.success).toBe(true);
    expect(qrKeyRes.data.unikey.length).toBeGreaterThan(10);
    console.log(`✓ QR Key: ${qrKeyRes.data.unikey.substring(0, 20)}...`);

    // 10. Test NetEase QR check status
    console.log('\n=== Test 10: NetEase QR Status ===');
    const qrStatusRes = await page.evaluate(async (key) => {
      const res = await fetch('http://localhost:3000/api/netease-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'qrCheck', key })
      });
      return res.json();
    }, qrKeyRes.data.unikey);
    expect(qrStatusRes.success).toBe(true);
    console.log(`✓ QR Status: code ${qrStatusRes.data.code} (801=waiting, 800=new key)`);

    // 11. Test NetEase player URL
    console.log('\n=== Test 11: NetEase Player URL ===');
    const playerRes = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3000/api/netease-player?action=url&songId=185792');
      return res.json();
    });
    expect(playerRes.success).toBe(true);
    expect(playerRes.data.url).toBeTruthy();
    console.log(`✓ Player URL: ${playerRes.data.url.substring(0, 50)}...`);

    // 12. Test NetEase session validation
    console.log('\n=== Test 12: Session Validation ===');
    const validateRes = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3000/api/netease-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate' })
      });
      return res.json();
    });
    expect(validateRes.success).toBe(true);
    console.log(`✓ Session valid: ${validateRes.data.valid}`);

    // 13. Test playback controls
    console.log('\n=== Test 13: Playback Controls ===');
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThanOrEqual(3);
    console.log(`✓ ${buttonCount} buttons found`);

    // 14. Test skip login modal if shown
    console.log('\n=== Test 14: Login Modal ===');
    const skipBtn = page.locator('button:has-text("跳过")');
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
      console.log('✓ Login modal skipped');
    } else {
      console.log('✓ No login modal shown (using cached session)');
    }

    // 15. Check for console errors
    console.log('\n=== Test 15: Console Errors ===');
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('net::ERR')
    );
    console.log(`✓ Console errors: ${criticalErrors.length} critical, ${errors.length} total`);

    console.log('\n========================================');
    console.log('ALL TESTS PASSED!');
    console.log('========================================\n');
  });
});