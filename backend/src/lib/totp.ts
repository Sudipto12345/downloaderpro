import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

const APP_NAME = "DownloadHub Pro";

export function createTotpSecret(): string {
  return generateSecret();
}

export function getOtpAuthUrl(email: string, secret: string): string {
  return generateURI({ issuer: APP_NAME, label: email, secret });
}

export async function getTotpQrDataUrl(email: string, secret: string): Promise<string> {
  const url = getOtpAuthUrl(email, secret);
  return QRCode.toDataURL(url);
}

export async function verifyTotpCode(secret: string, token: string): Promise<boolean> {
  try {
    const result = await verify({ secret, token: token.replace(/\s/g, "") });
    return result.valid;
  } catch {
    return false;
  }
}
