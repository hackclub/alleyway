import express from "express";
import Airtable from "airtable";
import { jwtVerify, createRemoteJWKSet } from "jose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();

// Configuration from environment with sensible defaults
const PORT = process.env.PORT || 3000;
const DEFAULT_BASE = `http://localhost:${process.env.DEV_PORT || 4321}`;
const baseUrl =
    process.env.DEV_BASE_URL || process.env.BASE_URL || DEFAULT_BASE;

app.use(cors());

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

app.post("/api/account/create", checkLogin, (req, res) => {
    res.json({ message: "you are authenticated", user: req.user });
});

app.get("/api/account/info", checkLogin, (req, res) => {
    res.json({ message: "you are authenticated", user: req.user });
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
