import express from "express";
import Airtable from "airtable";
import { jwtVerify, createRemoteJWKSet } from "jose";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";

dotenv.config();
const app = express();

// Configuration from environment with sensible defaults
const PORT = process.env.PORT || 3000;
const DEFAULT_BASE = `http://localhost:${process.env.DEV_PORT || 4321}`;
const baseUrl =
    process.env.DEV_BASE_URL || process.env.BASE_URL || DEFAULT_BASE;

app.use(cors());
app.use(express.json());

// URL to your auth server's JWKS endpoint (derived from baseUrl unless overridden)
const JWKS_URL =
    process.env.JWKS_URL || `${baseUrl.replace(/\/$/, "")}/api/auth/jwks`;
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
const base = airtable.base(process.env.AIRTABLE_BASE_ID);

// Simple test route

app.get("/", (req, res) => {
    res.send(
        "Alleyway backend. You're probably looking for alley.hackclub.com :)"
    );
});

app.post("/api/account/create", checkLogin, async (req, res) => {
    const { slackId, userId, userEmail } = req.body;
    console.log("Creating account for:", { slackId, userId, userEmail });

    // Basic validation
    if (!slackId || !userId || !userEmail) {
        return res.status(400).json({
            error: "Missing required fields: slackId, userId, or userEmail",
        });
    }

    try {
        const createdRecord = await base("Users").create({
            slack_id: slackId,
            id: userId,
            email: userEmail,
        });

        const user = createdRecord.fields;

        res.status(201).json({
            message: "User account created successfully",
            user: req.user,
            userInfo: user,
        });
    } catch (err) {
        console.error("Airtable error during account creation:", err);
        res.status(500).json({ error: "Failed to create user account" });
    }
});

app.post("/api/account/info", checkLogin, async (req, res) => {
    const slackId = req.body.slackId;

    if (!slackId) {
        return res
            .status(400)
            .json({ error: "Slack ID is required in the request body" });
    }

    try {
        const userRecords = await base("Users")
            .select({
                view: "Grid view",
                filterByFormula: `{slack_id} = "${slackId}"`,
            })
            .firstPage();

        if (!userRecords || userRecords.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const userRecord = userRecords[0];
        const user = userRecord.fields;

        let fullProjects = [];

        if (user.Projects && user.Projects.length > 0) {
            // Fetch all project records by ID
            const projectRecords = await Promise.all(
                user.Projects.map((projectId) =>
                    base("Projects")
                        .find(projectId)
                        .catch((err) => {
                            console.warn(
                                `Failed to fetch project ${projectId}:`,
                                err
                            );
                            return null; // Avoid breaking the Promise.all
                        })
                )
            );

            // Filter out failed lookups (nulls)
            fullProjects = projectRecords
                .filter((record) => record !== null)
                .map((record) => record.fields);
        }

        res.json({
            message: "User found",
            user: req.user,
            userInfo: {
                ...user,
                Projects: fullProjects, // Replace project IDs with full info
            },
        });
    } catch (err) {
        console.error("Airtable error in /api/account/info:", err);
        res.status(500).json({ error: "Failed to fetch user info" });
    }
});

app.post("/api/account/update", checkLogin, (req, res) => {
    res.json({ message: "you are authenticated", user: req.user });
});

app.get("/api/projects", (req, res) => {
    base("Projects")
        .select({ view: "real_projects" })
        .firstPage((err, records) => {
            if (err) {
                console.error(err);
                return res
                    .status(500)
                    .json({ error: "Failed to fetch projects" });
            }
            const projects = records.map((record) => record.fields);
            res.json(projects);
        });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Using BASE_URL=${baseUrl}`);
    console.log(`JWKS_URL=${JWKS_URL}`);
});

/* for every user, do the following
    1. Check for projects matching their slack ID in the Projects table
    2. If found, ensure the project is linked in their user record in the Users table
    3. Check https://identity.hackclub.com/api/external/check?email= and return their status
    4. Check the "PII" table by slack ID to see if they filled in their personal info
    */

cron.schedule("* * * * *", async () => {
    console.log("Syncing user data!");

    try {
        // 1. Fetch all users
        const users = await base("Users").select({ view: "Grid view" }).all();

        for (const userRecord of users) {
            const user = userRecord.fields;
            const slackId = user.slack_id;
            const userId = userRecord.id;
            const email = user.email;

            if (!slackId) {
                console.warn(`User ${userId} missing slack_id, skipping.`);
                continue;
            }

            // 2. Find matching projects by slack_id
            const projectRecords = await base("Projects")
                .select({
                    filterByFormula: `{slack_id} = "${slackId}"`,
                    fields: ["record_id"], // we only need IDs for linking
                })
                .all();

            const projectIds = projectRecords.map(
                (rec) => rec.fields.record_id
            );

            // 3. Call IDV API
            let idvStatus = null;
            try {
                const idvRes = await fetch(
                    `https://identity.hackclub.com/api/external/check?email=${encodeURIComponent(
                        email
                    )}`
                );

                if (idvRes.ok) {
                    const idvJson = await idvRes.json();
                    idvStatus = idvJson.result || null;
                } else {
                    console.warn(
                        `IDV API failed for ${email}: ${idvRes.status}`
                    );
                }
            } catch (e) {
                console.error(`IDV API error for ${email}:`, e);
            }

            // 4. Find PII record matching slack_id
            const piiRecords = await base("PII Records")
                .select({
                    filterByFormula: `{slack_id} = "${slackId}"`,
                    maxRecords: 1,
                })
                .firstPage();

            const piiRecordId = piiRecords.length > 0 ? piiRecords[0].id : null;

            // 5. Update user record with projects, idv_status, and linked PII record
            const fieldsToUpdate = {
                Projects: projectIds,
                idv_status: idvStatus,
            };

            if (piiRecordId) {
                fieldsToUpdate["PII Record"] = [piiRecordId];
                fieldsToUpdate["PII_exists?"] = true;
            } else {
                // Unlink if no PII record found
                fieldsToUpdate["PII Record"] = [];
                fieldsToUpdate["PII_exists?"] = false;
            }

            try {
                await base("Users").update(userId, fieldsToUpdate);
                console.log(`Updated user ${userId} (Slack ID: ${slackId})`);
            } catch (e) {
                console.error(`Failed to update user ${userId}:`, e);
            }
        }
    } catch (err) {
        console.error("Error during cron sync task:", err);
    }
});

async function verifyJwt(token) {
    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: baseUrl, // must match Better Auth baseUrl
            audience: baseUrl, // default audience is baseUrl unless overridden in plugin options :contentReference[oaicite:4]{index=4}
        });
        console.log("JWT payload:", payload);
        return payload; // contains user info (id, email etc) by default unless you customize with definePayload :contentReference[oaicite:5]{index=5}
    } catch (err) {
        console.error("JWT validation failed:", err);
        return null;
    }
}

async function checkLogin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const payload = await verifyJwt(token);
    if (!payload) return res.status(401).json({ error: "Invalid token" });

    // attach user info to request
    req.user = {
        id: payload.sub || payload.id, // depending on what definePayload or default includes
        email: payload.email,
        // etc
    };
    next();
}

// TODO: add astro middleware routing stuff here

// Also add routes for user info
