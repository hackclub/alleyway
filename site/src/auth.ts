import { betterAuth } from "better-auth";
import { openAPI } from "better-auth/plugins";
import { jwt } from "better-auth/plugins";
import Database from "better-sqlite3";
import dotenv from "dotenv";
dotenv.config();

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
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
            scope: ["read:user"],
        },
        slack: {
            clientId: process.env.SLACK_CLIENT_ID as string,
            clientSecret: process.env.SLACK_CLIENT_SECRET as string,
            team: "T0266FRGM",
        },
    },
    plugins: [openAPI(), jwt()],
    debug: true,
    trustedOrigins: [
        "http://localhost:4321",
        process.env.PUBLIC_PROD_URL as string,
        (process.env.PUBLIC_BETTER_AUTH_URL as string) || "",
    ],
});
