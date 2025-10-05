import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: "https://cd487188fc7d.ngrok-free.app/",
});

export const { signIn, signOut } = authClient;
