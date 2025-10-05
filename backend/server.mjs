import express from "express";
import Airtable from "airtable";
import { jwtVerify, createRemoteJWKSet } from "jose";
import cors from "cors";

// TODO: tunnel astro here so that it's merged with the backend
const app = express();
app.use(
    cors({
        origin: [
            "http://localhost:4321",
            "https://cd487188fc7d.ngrok-free.app",
        ],
    })
);
const PORT = process.env.PORT || 3000;
const baseUrl = "https://cd487188fc7d.ngrok-free.app";

// URL to your auth server's JWKS endpoint
const JWKS_URL = baseUrl + "/api/auth/jwks";
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

app.get("/", (req, res) => {
    res.send("Hello, World!");
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
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

app.get("/protected", checkLogin, (req, res) => {
    res.json({ message: "you are authenticated", user: req.user });
});

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
        id: payload.sub || payload.id, // depending on what definePayload or default includes :contentReference[oaicite:6]{index=6}
        email: payload.email,
        // etc
    };
    next();
}

// TODO: add astro middleware routing stuff here

// Also add routes for user info
