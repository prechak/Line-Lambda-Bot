# LINE Lambda Bot

LINE Bot ที่ใช้ AWS Lambda และ Google Gemini AI

## การตั้งค่า Environment Variables

คุณต้องสร้างไฟล์ `.env` ในโฟลเดอร์หลักและเพิ่ม environment variables ต่อไปนี้:

```env
# LINE Bot Configuration
CHANNEL_SECRET=your_line_channel_secret_here
CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Google Apps Script Web App URL for logging
LOGGING_ENDPOINT=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

## การแก้ไขปัญหา

### ปัญหา: Gemini API เกิดข้อผิดพลาด

หากคุณได้รับข้อความ "เกิดข้อผิดพลาดในการประมวลผลคำถาม กรุณาลองใหม่อีกครั้ง" ให้ตรวจสอบ:

1. **GEMINI_API_KEY**: ตรวจสอบว่า API key ถูกต้องและยังใช้งานได้
2. **Environment Variables**: ตรวจสอบว่าได้ตั้งค่า environment variables ใน AWS Lambda แล้ว
3. **API Quota**: ตรวจสอบว่าไม่เกิน quota ของ Gemini API

### การ Deploy

```bash
npm run deploy
```

### การทดสอบ

1. ส่งข้อความปกติ: บอทจะตอบกลับ "✅ ข้อความของคุณถูกบันทึกไว้แล้วครับ 📝"
2. ส่งข้อความที่ขึ้นต้นด้วย "ai": บอทจะใช้ Gemini AI ตอบกลับแบบเป็นธรรมชาติ
3. ส่งแค่ "ai" เปล่าๆ: บอทจะทักทายแบบเป็นมิตร

### ฟีเจอร์ AI

- **ตอบแบบเป็นธรรมชาติ**: ใช้ภาษาที่เป็นมิตร อบอุ่น และเข้าใจง่าย
- **ใช้ emoji**: เพื่อให้การสนทนาดูเป็นมิตรมากขึ้น
- **ปรับแต่งการตอบ**: ใช้ temperature 0.8 เพื่อเพิ่มความสร้างสรรค์
- **จำกัดความยาว**: ตอบไม่เกิน 1000 tokens เพื่อความรวดเร็ว
# Line-Lambda-Bot
# Line-Lambda-Bot
