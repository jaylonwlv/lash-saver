/** Instagram's and Facebook's in-app browsers, where sign-in doesn't carry over and file links can fail. */
export function isInAppBrowser(userAgent: string): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB/i.test(userAgent);
}
