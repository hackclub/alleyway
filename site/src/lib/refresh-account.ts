import { auth } from "@auth";

// Variable declarations
let session = null;
let userId: string | null = null;
let slackInfo: any = null;
let githubInfo: any = null;
let accounts: any[] | null = null;

let slackAccount: any = null;
let githubAccount: any = null;
let slackAccessToken: any | null = null;
let githubAccessToken: any | null = null;
let jwtToken: string | null = null;
let finalData: any = null;

/**
 * refreshAccount grabs the latest account info from Better Auth & provider APIs
 * Provides an easy object that can be keyed directly into Airtable on request
 */
export async function refreshAccount(headers: Headers) {
    try {
        // Get session
        session = await auth.api.getSession({ headers });
        console.log(session);

        userId = session?.session?.userId ?? null;

        if (!userId) {
            console.log("No user logged in");
        } else {
            console.log("Better Auth API endpoints:");
            console.log(Object.keys(auth.api));

            // Get JWT token
            const { token: string } = await auth.api.getToken({ headers });
            jwtToken = string;
            console.log("Got JWT token", jwtToken);

            // Get linked user accounts
            accounts = await auth.api.listUserAccounts({ headers });
            console.log("Loaded accounts", accounts);

            // Extract Slack and GitHub accounts
            slackAccount =
                accounts?.find((acc: any) => acc.providerId === "slack") ??
                null;
            githubAccount =
                accounts?.find((acc: any) => acc.providerId === "github") ??
                null;

            // Get Slack access token and account info
            slackAccessToken = (
                await auth.api.getAccessToken({
                    headers,
                    body: { providerId: "slack", accountId: slackAccount.id },
                })
            ).accessToken;

            slackInfo = await auth.api.accountInfo({
                headers,
                body: { accountId: slackAccount.accountId },
            });

            // If GitHub account exists, fetch token and info
            if (!githubAccount) {
                console.log("No GitHub account linked");
            } else {
                githubInfo = await auth.api.accountInfo({
                    headers,
                    body: { accountId: githubAccount.accountId },
                });

                githubAccessToken = (
                    await auth.api.getAccessToken({
                        headers,
                        body: {
                            providerId: "github",
                            accountId: githubAccount.id,
                        },
                    })
                ).accessToken;
            }

            console.log("Slack info", slackInfo);
        }
    } catch (e) {
        console.error("getSession failed", e);
    }

    // Compile final data
    finalData = {
        userId,
        slackInfo,
        githubInfo,
        slackAccount,
        githubAccount,
        slackAccessToken,
        githubAccessToken,
        jwtToken,
        accounts,
    };

    console.log("Final data:");
    console.log(finalData);

    return finalData;
}
