require("dotenv").config();
const serverless = require("serverless-http");
const express = require("express");
const { Client, middleware } = require("@line/bot-sdk");
const fetch = global.fetch || require("node-fetch");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const lineConfig = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

if (!lineConfig.channelSecret || !lineConfig.channelAccessToken) {
  throw new Error(
    "Missing CHANNEL_SECRET or CHANNEL_ACCESS_TOKEN in environment variables"
  );
}

// ตรวจสอบ GEMINI_API_KEY
if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY not found in environment variables");
}

// ตรวจสอบ LOGGING_ENDPOINT
if (!process.env.LOGGING_ENDPOINT) {
  console.warn("⚠️ LOGGING_ENDPOINT not found in environment variables");
}

const app = express();
const client = new Client(lineConfig);

app.get("/", (req, res) => res.status(200).json({ status: "ok" }));

app.post("/default/webhook", middleware(lineConfig), async (req, res) => {
  try {
    const result = await Promise.all(req.body.events.map(handleEvent));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function askGemini(prompt) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return "❌ ไม่สามารถเชื่อมต่อกับ AI ได้ กรุณาตรวจสอบการตั้งค่า API Key";
    }

    console.log(
      `🔍 Using API Key: ${process.env.GEMINI_API_KEY.substring(0, 10)}...`
    );
    console.log(`🔍 Prompt: "${prompt}"`);

    // เพิ่ม timeout 10 วินาทีสำหรับ Gemini API
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API timeout")), 10000);
    });

    // สร้าง prompt แบบง่ายๆ
    const simplePrompt = `ตอบคำถามนี้แบบเป็นมิตร: ${prompt}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 500,
      },
    });
    const apiPromise = model.generateContent(simplePrompt);

    const result = await Promise.race([apiPromise, timeoutPromise]);
    console.log(`🔍 Gemini result:`, JSON.stringify(result, null, 2));

    const response = await result.response;
    console.log(`🔍 Gemini response:`, JSON.stringify(response, null, 2));

    const text = response.text();
    console.log(`🔍 Gemini text: "${text}"`);

    // ตรวจสอบว่าข้อความไม่ว่าง
    if (!text || text.trim() === "") {
      console.warn("⚠️ Gemini returned empty response");
      return "ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง 😅";
    }

    return text;
  } catch (error) {
    console.error("❌ Gemini Error:", error);

    // ตรวจสอบประเภทของ error
    if (error.message && error.message.includes("API_KEY")) {
      return "❌ API Key ไม่ถูกต้อง กรุณาตรวจสอบการตั้งค่า";
    } else if (error.message && error.message.includes("quota")) {
      return "❌ เกินโควต้าการใช้งาน API กรุณาลองใหม่ในภายหลัง";
    } else if (error.message && error.message.includes("timeout")) {
      return "⏰ AI ใช้เวลาตอบนานเกินไป กรุณาลองใหม่อีกครั้ง";
    } else {
      return "เกิดข้อผิดพลาดในการประมวลผลคำถาม กรุณาลองใหม่อีกครั้ง";
    }
  }
}

// ✅ ส่งข้อมูลไป Google Apps Script Web App
async function logMessage(userId, sender, message) {
  try {
    if (!process.env.LOGGING_ENDPOINT) {
      console.log(
        `📝 Message not logged (no LOGGING_ENDPOINT) - Sender: ${sender}, UserId: ${userId}, Message: ${message}`
      );
      return;
    }

    console.log(
      `📝 Logging message - Sender: ${sender}, UserId: ${userId}, Message: ${message}`
    );

    // เพิ่ม timeout 5 วินาทีสำหรับ Google Apps Script
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Logging timeout")), 5000);
    });

    const fetchPromise = fetch(process.env.LOGGING_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, sender, message }),
    });

    await Promise.race([fetchPromise, timeoutPromise]);
    console.log(`✅ Message logged successfully for ${sender}`);
  } catch (error) {
    console.error(`❌ Error logging message for ${sender}:`, error);
    // ไม่ throw error เพื่อไม่ให้กระทบการทำงานหลักของบอท
  }
}

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const message = event.message.text;
  const userId = event.source.userId;
  let replyText = "✅ ข้อความของคุณถูกบันทึกไว้แล้วครับ 📝";

  console.log(
    `👤 User message received - UserId: ${userId}, Message: ${message}`
  );

  // ✅ บันทึกข้อความผู้ใช้ (ไม่รอผล)
  logMessage(userId, "user", message).catch((error) => {
    console.error("❌ Failed to log user message:", error);
  });

  // ถ้าข้อความขึ้นต้นด้วย "ai"
  if (message.toLowerCase().startsWith("ai")) {
    const question = message.slice(2).trim();
    if (question) {
      replyText = await askGemini(question);
    } else {
      replyText = await askGemini("สวัสดีครับ! มีอะไรให้ช่วยไหม? 😊");
    }
  }

  // ตรวจสอบว่าข้อความไม่ว่างก่อนส่งไป LINE
  if (!replyText || replyText.trim() === "") {
    console.warn("⚠️ Empty reply text detected, using fallback message");
    replyText =
      "ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง 😅";
  }

  console.log(`🤖 Bot reply sent - UserId: ${userId}, Reply: ${replyText}`);

  // ✅ บันทึกข้อความบอท (ไม่รอผล)
  logMessage(userId, "bot", replyText).catch((error) => {
    console.error("❌ Failed to log bot message:", error);
  });

  // ✅ ตอบกลับ LINE
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: replyText,
  });
}

module.exports.handler = serverless(app);
