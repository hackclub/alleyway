import { betterAuth } from "better-auth";
import { openAPI } from "better-auth/plugins";
import { jwt } from "better-auth/plugins";
import Database from "better-sqlite3";

export const auth = betterAuth({
    account: {
        accountLinking: {
            enabled: true,
            allowDifferentEmails: true,
        },
    },
    database: new Database("./sqlite.db"),
    socialProviders: {
        github: {
            clientId: import.meta.env.GITHUB_CLIENT_ID as string,
            clientSecret: import.meta.env.GITHUB_CLIENT_SECRET as string,
            scope: ["read:user"],
        },
        slack: {
            clientId: import.meta.env.SLACK_CLIENT_ID as string,
            clientSecret: import.meta.env.SLACK_CLIENT_SECRET as string,
            team: "T0266FRGM",
        },
    },
    plugins: [openAPI(), jwt()],
    debug: true,
    trustedOrigins: [
        "http://localhost:4321",
        import.meta.env.PUBLIC_PROD_URL as string,
        (import.meta.env.PUBLIC_BETTER_AUTH_URL as string) || "",
    ],
});
