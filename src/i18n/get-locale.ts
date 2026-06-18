"use server";
import { cookies } from "next/headers";
import { COOKIE_KEY_LOCALE, DEFAULT_LOCALE, SUPPORTED_LOCALES } from "lib/const";

function validateLocale(locale?: string): boolean {
  return SUPPORTED_LOCALES.some((v) => v.code === locale);
}

async function getLocaleFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(COOKIE_KEY_LOCALE)?.value;

  return validateLocale(locale) ? locale : undefined;
}

// Platform default is Traditional Chinese (DEFAULT_LOCALE). We honour an explicit
// user choice (locale cookie) but otherwise do NOT auto-detect from the browser
// Accept-Language header — the default must be deterministically zh-TW.
export async function getLocaleAction() {
  const fromCookie = await getLocaleFromCookie();
  return fromCookie || DEFAULT_LOCALE;
}
