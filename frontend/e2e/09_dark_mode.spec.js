import { test, expect } from '@playwright/test';

const darkThemes = ['dark', 'midnight', 'high-contrast'];

function luminance([r, g, b]) {
  const values = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * values[0]) + (0.7152 * values[1]) + (0.0722 * values[2]);
}

function rgb(value) {
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  return channels?.length === 3 ? channels : [0, 0, 0];
}

function contrast(foreground, background) {
  const first = luminance(rgb(foreground));
  const second = luminance(rgb(background));
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

async function setTheme(page, theme) {
  await page.addInitScript((selectedTheme) => {
    window.localStorage.setItem('smart_park_theme', selectedTheme);
    window.localStorage.setItem('smart_park_theme_auto_dark', 'false');
  }, theme);
}

test.describe('9. Integridad visual de temas oscuros', () => {
  for (const theme of darkThemes) {
    test(`modal de acceso usa superficies y contraste del tema ${theme}`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

      await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Acceso a Smart Park' });
      await expect(dialog).toBeVisible();

      const colors = await dialog.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          foreground: style.color,
          border: style.borderColor,
        };
      });

      expect(colors.background).not.toBe('rgb(255, 255, 255)');
      expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
      expect(colors.border).not.toBe('rgb(226, 232, 240)');
      expect(contrast(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);

      if (theme === 'dark') {
        await page.screenshot({
          path: 'e2e/screenshots/dark-mode-login-modal.png',
          fullPage: false,
          animations: 'disabled',
        });
      }
    });
  }

  test('panel oscuro no contiene superficies claras grandes accidentales', async ({ page }) => {
    const driver = {
      id: 'dark-mode-driver',
      name: 'Usuario Nocturno',
      email: 'night@smartpark.pe',
      role: 'user',
      is_active: true,
    };

    await setTheme(page, 'dark');
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      const body = url.includes('/auth/me') ? driver : [];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.addInitScript((user) => {
      window.localStorage.setItem('smart_park_user_session', JSON.stringify(user));
      window.localStorage.setItem('smart_park_access_token', 'dark-mode-test-token');
    }, driver);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Estacionamientos Inteligentes en Ayacucho')).toBeVisible({ timeout: 15000 });

    const accidentalLightSurfaces = await page.evaluate(() => {
      const isLight = (color) => {
        const values = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [];
        return values.length === 3 && values.every((channel) => channel >= 238);
      };

      return [...document.querySelectorAll('body *')]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.width * rect.height < 20000 || rect.bottom < 0 || rect.top > innerHeight) return false;
          if (element.closest('.theme-preserve-white')) return false;
          return isLight(getComputedStyle(element).backgroundColor);
        })
        .slice(0, 10)
        .map((element) => ({ tag: element.tagName, className: String(element.className) }));
    });

    expect(accidentalLightSurfaces).toEqual([]);
    await page.screenshot({
      path: 'e2e/screenshots/dark-mode-dashboard.png',
      fullPage: false,
      animations: 'disabled',
    });
  });
});
