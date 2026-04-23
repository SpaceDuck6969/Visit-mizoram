require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const pool = require("./public/connection");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const publicDir = path.join(__dirname, "public");
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedExt = /\.(jpe?g|png|webp)$/i;
    const extOk = allowedExt.test(path.extname(file.originalname));
    const mime = (file.mimetype || "").toLowerCase();
    const mimeOk =
        !mime ||
        /^image\/(jpeg|png|webp)$/.test(mime) ||
        mime === "image/jpg";
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error("Only .png, .jpg, .jpeg, and .webp images are allowed."));
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});

app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://fonts.googleapis.com",
                    "https://unpkg.com"
                ],
                fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
                imgSrc: ["'self'", "data:", "https:", "blob:"],
                connectSrc: ["'self'"],
                // Allow inline event handlers (onclick) on legacy pages; scripts still limited to 'self' + unpkg
                scriptSrc: ["'self'", "https://unpkg.com"],
                scriptSrcAttr: ["'unsafe-inline'"]
            }
        },
        crossOriginEmbedderPolicy: false
    })
);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadDir));
app.use(express.static(publicDir));

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_EXTRA_API_KEY = process.env.NVIDIA_EXTRA_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_MODEL = "z-ai/glm5";
const NEMOTRON_MODEL = "nvidia/nemotron-3-super-120b-a12b";

function normalizeLanguage(language) {
    const value = (language || "").toString().trim();
    return value || "English";
}

function isComplexQuery(message) {
    const text = (message || "").toLowerCase();
    if (text.length > 220) return true;
    return /(detailed|step by step|itinerary|plan for|compare|budget|best route|multi-day|7 day|5 day)/.test(text);
}

function resolveModelConfig(userMessage) {
    const useNemotron = isComplexQuery(userMessage) && !!(NVIDIA_EXTRA_API_KEY || NVIDIA_API_KEY);
    if (useNemotron) {
        return {
            model: NEMOTRON_MODEL,
            apiKey: NVIDIA_EXTRA_API_KEY || NVIDIA_API_KEY,
            bodyExtras: {
                extra_body: {
                    chat_template_kwargs: { enable_thinking: true },
                    reasoning_budget: 2048
                }
            }
        };
    }
    return {
        model: DEFAULT_MODEL,
        apiKey: NVIDIA_API_KEY,
        bodyExtras: {}
    };
}

function sanitizeReplyText(input) {
    let text = (input || "")
        .replace(/\*\*/g, "")
        .replace(/^[#>\-\*]+/gm, "")
        .replace(/\r/g, "")
        .trim();
    
    // Remove any echoed system instructions
    const instructionPatterns = [
        /We need to output plain text[\s\S]*/i,
        /no markdown[\s\S]*/i,
        /no asterisks[\s\S]*/i,
        /bullet points[\s\S]*/i,
        /Use plain text[\s\S]*/i,
        /Avoid bullet points[\s\S]*/i,
        /Provide structured by day[\s\S]*/i,
        /Include realistic travel times[\s\S]*/i,
        /Ensure no markdown[\s\S]*/i,
    ];
    
    instructionPatterns.forEach(pattern => {
        text = text.replace(pattern, "");
    });
    
    return text.trim();
}

function sanitizeStreamChunk(input) {
    return (input || "")
        .replace(/\*\*/g, "")
        .replace(/\r/g, "");
}

function buildMessages(userMessage, language) {
    return [
        {
            role: "system",
            content:
                `You are a Mizoram travel planner assistant. Reply in ${language}. ` +
                "Provide helpful, practical travel advice about Mizoram."
        },
        { role: "user", content: userMessage }
    ];
}

function isWeatherIntent(message) {
    const text = (message || "").toLowerCase();
    return /(weather|temperature|temp|rain|raining|forecast|humidity|wind|climate)/.test(text);
}

function extractLocation(message) {
    const text = (message || "").trim();
    const inMatch = text.match(/\b(?:in|at|for)\s+([a-zA-Z][a-zA-Z\s,.-]{1,80})/i);
    if (inMatch && inMatch[1]) {
        return inMatch[1].replace(/[?.!,;:]+$/g, "").trim();
    }
    return "Aizawl, Mizoram";
}

function wantsTomorrowForecast(message) {
    const text = (message || "").toLowerCase();
    return /(tomorrow|next day|next\s+24\s*hours)/.test(text);
}

async function fetchWeatherData(userMessage) {
    if (!WEATHER_API_KEY || !isWeatherIntent(userMessage)) return null;

    const location = extractLocation(userMessage);
    const wantsTomorrow = wantsTomorrowForecast(userMessage);

    const url = new URL("https://api.weatherapi.com/v1/forecast.json");
    url.searchParams.set("key", WEATHER_API_KEY);
    url.searchParams.set("q", location);
    url.searchParams.set("aqi", "no");
    url.searchParams.set("days", "2");

    try {
        const response = await fetch(url.toString());
        const data = await response.json();
        if (!response.ok || !data?.current || !data?.location) return null;

        const place = `${data.location.name}, ${data.location.region || data.location.country}`;
        const tomorrow = data?.forecast?.forecastday?.[1]?.day || null;
        return {
            place,
            wantsTomorrow,
            current: data.current,
            tomorrow
        };
    } catch (_) {
        return null;
    }
}

function buildWeatherReply(weatherData) {
    const current = weatherData.current;
    const currentLine =
        `Current weather in ${weatherData.place}: ${current.temp_c}C, ` +
        `${current.condition?.text || "Condition unavailable"}, humidity ${current.humidity}%, ` +
        `wind ${current.wind_kph} kph.`;

    if (weatherData.wantsTomorrow) {
        if (!weatherData.tomorrow) {
            return `${currentLine} Tomorrow forecast is not available right now from the weather provider.`;
        }
        return (
            `Tomorrow forecast for ${weatherData.place}: ` +
            `min ${weatherData.tomorrow.mintemp_c}C, max ${weatherData.tomorrow.maxtemp_c}C, ` +
            `${weatherData.tomorrow.condition?.text || "Condition unavailable"}, ` +
            `chance of rain ${weatherData.tomorrow.daily_chance_of_rain}%. ` +
            `${currentLine}`
        );
    }

    return currentLine;
}

async function buildMessagesWithContext(userMessage, language) {
    const messages = buildMessages(userMessage, language);
    const weatherContext = await fetchWeatherData(userMessage);
    if (weatherContext) {
        messages.splice(1, 0, {
            role: "system",
            content:
                `Weather data for ${weatherContext.place}: ` +
                `current ${weatherContext.current.temp_c}C, ${weatherContext.current.condition?.text || "unavailable"}, ` +
                `humidity ${weatherContext.current.humidity}%, wind ${weatherContext.current.wind_kph} kph. ` +
                (weatherContext.tomorrow
                    ? `Tomorrow min ${weatherContext.tomorrow.mintemp_c}C max ${weatherContext.tomorrow.maxtemp_c}C, ` +
                      `condition ${weatherContext.tomorrow.condition?.text || "unavailable"}, ` +
                      `rain chance ${weatherContext.tomorrow.daily_chance_of_rain}%. `
                    : "Tomorrow forecast unavailable. ") +
                "If user asks about tomorrow weather, prioritize the tomorrow forecast values exactly."
        });
    }
    return messages;
}

function ensureApiKey(res, userMessage) {
    const cfg = resolveModelConfig(userMessage || "");
    if (!cfg.apiKey) {
        res.status(500).json({
            error: "Server is missing API key for selected model. Set env keys and restart."
        });
        return false;
    }
    return true;
}

app.get("/api/weather", async (req, res) => {
    const raw = (req.query.q || req.query.location || "Aizawl").toString().trim();
    const q = raw || "Aizawl";
    if (!WEATHER_API_KEY) {
        return res.json({
            ok: false,
            query: q,
            message: "Weather is not configured. Set WEATHER_API_KEY and restart the server."
        });
    }

    try {
        const url = new URL("https://api.weatherapi.com/v1/current.json");
        url.searchParams.set("key", WEATHER_API_KEY);
        const queryText = q.toLowerCase().includes("india") ? q : `${q}, Mizoram, India`;
        url.searchParams.set("q", queryText);
        url.searchParams.set("aqi", "no");

        const response = await fetch(url.toString());
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status >= 400 ? response.status : 502).json({
                ok: false,
                query: q,
                message: data?.error?.message || "Weather lookup failed."
            });
        }
        if (!data?.current || !data?.location) {
            return res.json({
                ok: false,
                query: q,
                message: "Incomplete weather response."
            });
        }

        let iconUrl = data.current.condition?.icon || "";
        if (iconUrl && iconUrl.startsWith("//")) iconUrl = `https:${iconUrl}`;

        return res.json({
            ok: true,
            location: {
                name: data.location.name,
                region: data.location.region,
                country: data.location.country
            },
            current: {
                temp_c: data.current.temp_c,
                feelslike_c: data.current.feelslike_c,
                condition: data.current.condition?.text,
                icon: iconUrl,
                humidity: data.current.humidity,
                wind_kph: data.current.wind_kph,
                is_day: data.current.is_day
            },
            updated: new Date().toISOString()
        });
    } catch (error) {
        return res.status(500).json({
            ok: false,
            query: q,
            message: error.message || "Server error"
        });
    }
});

// --- MySQL: hotel registration & listings (same process, same port) ---
app.post("/api/hotels/register", upload.array("hotelImages", 10), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { hotelName, hotelAddress, hotelContact, hotelDescription, latitude, longitude } = req.body;

        if (!hotelName || !hotelAddress || !hotelContact || !hotelDescription || !latitude || !longitude) {
            return res.status(400).json({ error: "Missing required text fields." });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "At least one image is required." });
        }

        await connection.beginTransaction();

        const insertHotelQuery = `INSERT INTO Hotel (hotel_name, hotel_address, hotel_contact, hotel_description, latitude, longitude) 
            VALUES (?, ?, ?, ?, ?, ?)`;

        const [hotelResult] = await connection.execute(insertHotelQuery, [
            hotelName,
            hotelAddress,
            hotelContact,
            hotelDescription,
            latitude,
            longitude
        ]);

        const newHotelId = hotelResult.insertId;

        const insertImageQuery = "INSERT INTO Hotel_Images (hotel_id, image_url) VALUES (?, ?)";
        for (const file of req.files) {
            const dbFilePath = `/uploads/${file.filename}`;
            await connection.execute(insertImageQuery, [newHotelId, dbFilePath]);
        }

        await connection.commit();

        res.status(201).json({
            message: "Registered successfully!",
            hotelId: newHotelId
        });
    } catch (error) {
        await connection.rollback();
        console.error("Server Error:", error);
        if (req.files) req.files.forEach((file) => fs.unlinkSync(file.path));
        res.status(500).json({ error: error.message || "Failed to process registration." });
    } finally {
        connection.release();
    }
});

app.get("/api/hotels", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [hotels] = await connection.execute(`
            SELECT h.*, GROUP_CONCAT(hi.image_url) as images 
            FROM Hotel h
            LEFT JOIN Hotel_Images hi ON h.hotel_id = hi.hotel_id
            GROUP BY h.hotel_id
            ORDER BY h.hotel_id DESC
        `);

        const formattedHotels = hotels.map((hotel) => ({
            ...hotel,
            images: hotel.images ? hotel.images.split(",") : []
        }));

        res.json(formattedHotels);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch properties." });
    } finally {
        connection.release();
    }
});

// ==========================================
// HOTEL ROUTE 1: Get ALL Hotels (For Admin)
// ==========================================
app.get("/api/hotels", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [hotels] = await connection.execute(`
            SELECT h.*, GROUP_CONCAT(hi.image_url) as images 
            FROM Hotel h
            LEFT JOIN Hotel_Images hi ON h.hotel_id = hi.hotel_id
            GROUP BY h.hotel_id
            ORDER BY h.hotel_id DESC
        `);

        const formattedHotels = hotels.map((hotel) => ({
            ...hotel,
            images: hotel.images ? hotel.images.split(",") : []
        }));

        res.json(formattedHotels);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch properties." });
    } finally {
        connection.release();
    }
});

// ==========================================
// HOTEL ROUTE 2: Get ONLY Verified (For Public)
// MUST BE BEFORE THE :id ROUTE!
// ==========================================
app.get("/api/hotels/verified", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [hotels] = await connection.execute(`
            SELECT h.*, GROUP_CONCAT(hi.image_url) as images 
            FROM Hotel h
            LEFT JOIN Hotel_Images hi ON h.hotel_id = hi.hotel_id
            WHERE h.is_verified = 1
            GROUP BY h.hotel_id
            ORDER BY h.hotel_id DESC
        `);

        const formattedHotels = hotels.map((hotel) => ({
            ...hotel,
            images: hotel.images ? hotel.images.split(",") : []
        }));

        res.json(formattedHotels);
    } catch (error) {
        console.error("Error fetching verified hotels:", error);
        res.status(500).json({ error: "Failed to fetch properties." });
    } finally {
        connection.release();
    }
});

// ==========================================
// HOTEL ROUTE 3: Get Single Hotel by ID
// ==========================================
app.get("/api/hotels/:id", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const hotelId = req.params.id;
        
        const [hotels] = await connection.execute(`
            SELECT h.*, GROUP_CONCAT(hi.image_url) as images 
            FROM Hotel h
            LEFT JOIN Hotel_Images hi ON h.hotel_id = hi.hotel_id
            WHERE h.hotel_id = ?
            GROUP BY h.hotel_id
        `, [hotelId]);

        if (hotels.length === 0) {
            return res.status(404).json({ error: "Hotel not found" });
        }

        const hotel = hotels[0];
        hotel.images = hotel.images ? hotel.images.split(",") : [];
        
        res.json(hotel);
    } catch (error) {
        console.error("Error fetching single hotel:", error);
        res.status(500).json({ error: "Failed to fetch hotel details." });
    } finally {
        connection.release();
    }
});
// ==========================================
// REVIEWS ROUTE 1: Get Reviews for a Hotel
// ==========================================
app.get("/api/hotels/:id/reviews", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const hotelId = req.params.id;
        
        const [reviews] = await connection.execute(`
            SELECT r.*, u.username 
            FROM hotel_reviews r 
            JOIN Users u ON r.user_id = u.user_id 
            WHERE r.hotel_id = ? AND r.status = 'approved'
            ORDER BY r.created_at DESC
        `, [hotelId]);
        
        res.json(reviews);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({ error: "Failed to fetch reviews." });
    } finally {
        connection.release();
    }
});

// ==========================================
// REVIEWS ROUTE 2: Submit a New Review
// ==========================================
app.post("/api/reviews", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { hotel_id, user_id, rating, title, comment } = req.body;

        if (!hotel_id || !user_id || !rating || !title || !comment) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const [existing] = await connection.execute(
            "SELECT * FROM hotel_reviews WHERE hotel_id = ? AND user_id = ?",
            [hotel_id, user_id]
        );

        if (existing.length > 0) {
            return res.status(403).json({ error: "You have already reviewed this hotel." });
        }

        await connection.execute(`
            INSERT INTO hotel_reviews (hotel_id, user_id, rating, title, comment, status) 
            VALUES (?, ?, ?, ?, ?, 'approved')
        `, [hotel_id, user_id, rating, title, comment]);

        await connection.execute(`
            UPDATE Hotel 
            SET hotel_rating = (
                SELECT ROUND(AVG(rating), 1) 
                FROM hotel_reviews 
                WHERE hotel_id = ? AND status = 'approved'
            )
            WHERE hotel_id = ?
        `, [hotel_id, hotel_id]);

        res.status(201).json({ message: "Review added successfully!" });
    } catch (error) {
        console.error("Error inserting review:", error);
        res.status(500).json({ error: "Failed to save review." });
    } finally {
        connection.release();
    }
});

app.post("/api/chat", async (req, res) => {
    if (!ensureApiKey(res, req.body?.message)) return;
    try {
        const userMessage = (req.body?.message || "").toString().trim();
        const language = normalizeLanguage(req.body?.language);
        const modelConfig = resolveModelConfig(userMessage);
        if (!userMessage) return res.status(400).json({ error: "Message is required." });
        const weatherData = await fetchWeatherData(userMessage);
        if (weatherData) {
            return res.json({ reply: sanitizeReplyText(buildWeatherReply(weatherData)) });
        }

        const messages = await buildMessagesWithContext(userMessage, language);
        const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${modelConfig.apiKey}`
            },
            body: JSON.stringify({
                model: modelConfig.model,
                messages,
                temperature: 0.7,
                top_p: 0.95,
                max_tokens: 280,
                stream: false,
                ...modelConfig.bodyExtras
            })
        });

        const data = await response.json();
        if (!response.ok) return res.status(response.status).json({ error: data?.error || "Upstream API error" });

        const reply = sanitizeReplyText(data?.choices?.[0]?.message?.content || "");
        return res.json({ reply });
    } catch (error) {
        return res.status(500).json({ error: error.message || "Server error" });
    }
});

app.post("/api/chat/stream", async (req, res) => {
    const modelConfig = resolveModelConfig(req.body?.message || "");
    if (!modelConfig.apiKey) {
        res.setHeader("Content-Type", "text/event-stream");
        res.write("data: [ERROR] Server is missing API key for selected model.\n\n");
        res.end();
        return;
    }

    try {
        const userMessage = (req.body?.message || "").toString().trim();
        const language = normalizeLanguage(req.body?.language);
        if (!userMessage) return res.status(400).json({ error: "Message is required." });
        const weatherData = await fetchWeatherData(userMessage);
        if (weatherData) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.write(`data: ${JSON.stringify(buildWeatherReply(weatherData))}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
            return;
        }

        const messages = await buildMessagesWithContext(userMessage, language);
        const upstream = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${modelConfig.apiKey}`
            },
            body: JSON.stringify({
                model: modelConfig.model,
                messages,
                temperature: 0.7,
                top_p: 0.95,
                max_tokens: 280,
                stream: true,
                ...modelConfig.bodyExtras
            })
        });

        if (!upstream.ok || !upstream.body) {
            const err = await upstream.text();
            return res.status(upstream.status).json({ error: err || "Upstream stream error" });
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const payload = trimmed.slice(5).trim();
                if (!payload || payload === "[DONE]") continue;

                try {
                    const json = JSON.parse(payload);
                    const delta = json?.choices?.[0]?.delta?.content || "";
                    if (delta) {
                        const safe = sanitizeStreamChunk(delta);
                        if (safe) res.write(`data: ${JSON.stringify(safe)}\n\n`);
                    }
                } catch (_) {
                    // Ignore malformed stream fragments.
                }
            }
        }

        res.write("data: [DONE]\n\n");
        res.end();
    } catch (error) {
        res.write(`data: [ERROR] ${error.message || "Server stream error"}\n\n`);
        res.end();
    }
});

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Nodemailer Setup (Use Mailtrap for localhost testing)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const JWT_SECRET = process.env.JWT_SECRET || "mizoram_super_secret_key";


// ==========================================
// AUTH ROUTE 1: Register
// ==========================================
app.post("/api/auth/register", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) return res.status(400).json({ error: "Missing fields." });

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const otp_code = generateOTP();

        // Check if user exists
        const [existing] = await connection.execute("SELECT email FROM Users WHERE email = ?", [email]);
        if (existing.length > 0) return res.status(400).json({ error: "Email already registered." });

        // Insert new user with OTP expiring in 10 minutes
        const insertQuery = `
            INSERT INTO Users (username, email, password_hash, otp_code, otp_expires_at, is_verified) 
            VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), false)
        `;
        await connection.execute(insertQuery, [username, email, password_hash, otp_code]);

        // Send Email
        await transporter.sendMail({
            from: '"Visit Mizoram" <auth@visitmizoram.com>',
            to: email,
            subject: 'Your Registration Code',
            html: `<p>Welcome, ${username}! Your code is: <b>${otp_code}</b>. It expires in 10 minutes.</p>`,
        });

        res.status(201).json({ message: "OTP Sent." });
    } catch (error) {
        res.status(500).json({ error: "Registration failed." });
    } finally {
        connection.release();
    }
});

// ==========================================
// AUTH ROUTE 2: Login (Request OTP)
// ==========================================
app.post("/api/auth/login", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { email, password } = req.body;
        
        const [users] = await connection.execute("SELECT * FROM Users WHERE email = ?", [email]);
        if (users.length === 0) return res.status(400).json({ error: "Invalid credentials." });
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials." });

        // Generate new OTP for this session
        const otp_code = generateOTP();
        await connection.execute(
            "UPDATE Users SET otp_code = ?, otp_expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE email = ?",
            [otp_code, email]
        );

        await transporter.sendMail({
            from: '"Visit Mizoram" <temporaryrin@gmail.com>',
            to: email,
            subject: 'Your Login Code',
            html: `<p>Your secure login code is: <b>${otp_code}</b>. It expires in 10 minutes.</p>`,
        });

        res.json({ message: "OTP Sent to email." });
    } catch (error) {
        res.status(500).json({ error: "Login failed." });
    } finally {
        connection.release();
    }
});

// ==========================================
// AUTH ROUTE 3: Verify OTP & Start Session
// ==========================================
app.post("/api/auth/verify", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { email, otp_code } = req.body;

        const [users] = await connection.execute(
            "SELECT * FROM Users WHERE email = ? AND otp_code = ? AND otp_expires_at > NOW()", 
            [email, otp_code]
        );

        if (users.length === 0) {
            return res.status(400).json({ error: "Invalid or expired OTP." });
        }

        const user = users[0];

        // Wipe OTP and verify
        await connection.execute(
            "UPDATE Users SET is_verified = true, otp_code = NULL, otp_expires_at = NULL WHERE email = ?",
            [email]
        );

        // Generate Session Token
        const token = jwt.sign({ id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ 
            message: "Login successful", 
            token, 
            user: { username: user.username, email: user.email } 
        });

    } catch (error) {
        // ADD THIS LINE to see exactly why Nodemailer is failing
        console.error("FULL REGISTRATION ERROR:", error); 
        
        res.status(500).json({ error: "Registration failed." });
    } finally {
        connection.release();
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
});

// Multer / upload errors → JSON (must be after routes that use upload)
app.use((err, req, res, next) => {
    if (!err) return next();
    console.error("Upload/API error:", err);
    if (req.files && Array.isArray(req.files)) {
        req.files.forEach((file) => {
            try {
                if (file && file.path) fs.unlinkSync(file.path);
            } catch (_) {}
        });
    }
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
        err.message ||
        (err.code === "LIMIT_FILE_SIZE" ? "Each image must be 5MB or smaller." : "Upload or request failed.");
    res.status(status).json({ error: message });
});

const server = app.listen(PORT, () => {
    console.log(`Visit Mizoram server: http://localhost:${PORT}`);
    console.log("  AI chat, weather, static site, MySQL hotels & uploads — single process.");
});

server.on("error", (error) => {
    if (error && error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Run "npm run stop" then "npm start".`);
        process.exit(1);
    }
    console.error("Server failed to start:", error?.message || error);
    process.exit(1);
});

// ==========================================
// ADMIN ROUTE: Login
// ==========================================
app.get("/api/hotels", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [hotels] = await connection.execute(`
            SELECT h.*, GROUP_CONCAT(hi.image_url) as images 
            FROM Hotel h
            LEFT JOIN Hotel_Images hi ON h.hotel_id = hi.hotel_id
            GROUP BY h.hotel_id
            ORDER BY h.hotel_id DESC
        `);

        const formattedHotels = hotels.map((hotel) => ({
            ...hotel,
            images: hotel.images ? hotel.images.split(",") : []
        }));

        res.json(formattedHotels);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch properties." });
    } finally {
        connection.release();
    }
});

app.post("/api/admin/login", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { admin_name, admin_password } = req.body;
        
        // 1. Find the admin by name
        const [admins] = await connection.execute(
            "SELECT * FROM admins WHERE admin_name = ?", 
            [admin_name]
        );
        
        if (admins.length === 0) {
            return res.status(401).json({ error: "Invalid admin credentials." });
        }
        
        const admin = admins[0];
        

       // 2. Compare plain text to plain text (UNSECURE - TESTING ONLY)
        const isMatch = (admin_password === admin.admin_password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid admin credentials." });
        }

        // 3. Generate an Admin Session Token
        const token = jwt.sign(
            { id: admin.admin_id, role: 'admin', name: admin.admin_name }, 
            JWT_SECRET, 
            { expiresIn: '12h' }
        );

        res.json({ 
            message: "Admin login successful", 
            token, 
            admin: { name: admin.admin_name } 
        });

    } catch (error) {
        console.error("Admin Login Error:", error);
        res.status(500).json({ error: "Server error during admin login." });
    } finally {
        connection.release();
    }
});
// ==========================================
// ADMIN ROUTE:1. VERIFY HOTEL ROUTE
// ==========================================
// 
app.put("/api/hotels/:id/verify", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const hotelId = req.params.id;
        const { is_verified } = req.body; 

        await connection.execute(
            "UPDATE Hotel SET is_verified = ? WHERE hotel_id = ?", 
            [is_verified, hotelId]
        );
        res.json({ message: "Hotel verification updated!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update hotel." });
    } finally {
        connection.release();
    }
});

// ==========================================
// ADMIN ROUTE: Get All Users
// ==========================================
app.get("/api/admin/users", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [users] = await connection.execute(
            "SELECT user_id, username, email, is_verified FROM Users ORDER BY user_id DESC"
        );
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users." });
    } finally {
        connection.release();
    }
});

// ==========================================
// ADMIN ROUTE: Delete User
// ==========================================
app.delete("/api/admin/users/:id", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.params.id;
        await connection.execute("DELETE FROM Users WHERE user_id = ?", [userId]);
        res.json({ message: "User deleted successfully." });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Failed to delete user." });
    } finally {
        connection.release();
    }
});

