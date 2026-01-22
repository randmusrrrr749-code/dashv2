// lib/session.ts
import type { SessionOptions } from "iron-session";


export type SessionData = {
  address?: `0x${string}`;
  nonce?: string;
  nonceIssuedAt?: number;
};

export const sessionOptions: SessionOptions = {
  cookieName: "weewux_session",
  password: process.env.SESSION_PASSWORD!, // must be 32+ chars
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
};
