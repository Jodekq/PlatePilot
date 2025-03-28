// lib/server/auth.ts
import { Lucia } from "lucia";
import { dev } from "$app/environment";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import prisma from '$lib/prismaClient';

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
 sessionCookie: {
  attributes: {
   // set to `true` when using HTTPS
   secure: true
  }
 },
    getUserAttributes: (attributes)=>{
        return {
            username: attributes.username
        }
    }
});

declare module "lucia" {
 interface Register {
  Lucia: typeof lucia;
        DatabaseUserAttributes: DatabaseUserAttributes
 }
}

interface DatabaseUserAttributes {
    username: string
}