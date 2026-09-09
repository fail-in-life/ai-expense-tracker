// ==========================================
//   核心設定區
// ==========================================
const PROPERTIES = PropertiesService.getScriptProperties();

const CONFIG = {
  GEMINI_API_KEY: PROPERTIES.getProperty('GEMINI_API_KEY'),
  SHEET_ID: PROPERTIES.getProperty('SHEET_ID'),
  SHEET_NAME: 'TelegramExpenseTrackingTool_GoogleAppScript',
  TELEGRAM_BOT_TOKEN: PROPERTIES.getProperty('TELEGRAM_BOT_TOKEN'),
  WEBHOOK_URL: PROPERTIES.getProperty('WEBHOOK_URL'),
  //ALLOWED_CHAT_ID: PROPERTIES.getProperty('ALLOWED_CHAT_ID'),

  USER_CONTEXT: `
    - 預設幣別: JPY
    - 常用帳戶(Account): 現金錢包, 銀行帳戶, 電子支付帳戶
    - 常用支付方式(Payment Method): 現金, 信用卡, 轉帳, 行動支付
    - 常用標籤(Tags): #私人, #旅遊, #固定支出, #吃飯
`
};

// ==========================================
//   主程式：Telegram Webhook
// ==========================================
function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const updateId = contents.update_id;
    const chatId = contents.message.chat.id;
    
    // 基本防重複（保留著多一層保險）
    const cache = PropertiesService.getScriptProperties();
    if (cache.getProperty(updateId)) return ContentService.createTextOutput("OK");
    cache.setProperty(updateId, "true");

    if (contents.message && contents.message.text) {
      const chatId = contents.message.chat.id;
      const userMessage = contents.message.text;
      const msgDate = new Date(contents.message.date * 1000);

      // 判斷指令
      if (userMessage.startsWith('/')) {
        handleCommands(chatId, userMessage);
      } else {
        sendChatAction(chatId, 'typing');
        const aiData = callGemini(userMessage, msgDate);
        if (aiData && aiData.amount) {
          saveToSheet(aiData);
          sendMessage(chatId, formatReply(aiData));
        }
      }

      // --- 【關鍵：執行完畢後立即執行暴力重設】 ---
      // 這樣 Telegram 剛打算要「重傳」時，門就被關掉重開了，舊訊息會被 drop 掉
      resetWebhookBruteForce();
    }
    
    return ContentService.createTextOutput("OK");
    
  } catch (error) {
    // 發生錯誤也重設一次，確保不會死鎖
    resetWebhookBruteForce();
    return ContentService.createTextOutput("OK");
  }
}

// ==========================================
//   Gemini AI 處理核心
// ==========================================
function callGemini(text, msgDate) {
  const nowStr = Utilities.formatDate(
    msgDate,
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm:ss"
  );

  const prompt = `
你是一個專業記帳助手。請分析使用者輸入，提取資料並輸出為純 JSON。

【當下時間基準】: ${nowStr}
【使用者習慣與背景】: ${CONFIG.USER_CONTEXT}

【欄位定義】
1. timestamp:若無特別指定則使用當下時間。若前後文中有指定時間，則以前後文中指定時間為主。
2. amount:請提供金額的數字表示，必須為正數，並且不應包含任何貨幣符號。
3. currency:預設為JPY，若有其他貨幣請明確指出，並使用三位字母的貨幣代碼(例如：USD、EUR)。
4. type:請選擇一個類型，選項包括 expense(支出)、income（收入）或 transfer（轉帳）。
5. category:請從以下類別中選擇：Food（食物）、Drink（飲料）、Rent（租金）、Transport（交通）、Utilities（公用事業）、Groceries（雜貨）、Salary（薪水）、Savings（儲蓄）等，並確保選擇的類別與金額類型相符。
6. subcategory:若無需填寫請填入'空'，並確保不留空白。
7. payment_method:請選擇支付方式，選項包括 Cash（現金）、Credit card（信用卡）、Pay pay（Pay pay）、Bank transfer（銀行轉帳）等，並確保選擇的方式與交易類型相符。
8. account:選項包括 Cash（現金）、Credit card（信用卡）、Pay pay（Pay pay）、Bank transfer（銀行轉帳）等，沒有指定的話預設為 Cash（現金）。
9. merchant_or_counterparty:請提供商家或對方的名稱，必須為有效名稱，並避免使用簡稱。
10. tags:若無需填寫請填入'空'，並確保不留空白。
11. note:請提供原始說明文字，必須包含在輸出中，並確保其完整性。

【規則】
- 只回傳純 JSON
- 無法判斷填 null
- 請確保所有輸出字段都按照指定格式填寫，並且不遺漏任何字段。
- 若輸入的文字信息中缺少某些信息，請根據上下文推斷並填寫合理的預設值。
- 若有任何不明確的地方，請在生成的輸出中標註"無法確定"以便後續確認。

使用者輸入: "${text}"
`;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const json = JSON.parse(response.getContentText());
  if (json.error) throw new Error(json.error.message);

  let rawText = json.candidates[0].content.parts[0].text;
  rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

  return JSON.parse(rawText);
}

// ==========================================
//   Google Sheet 寫入
// ==========================================
function saveToSheet(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  const rowData = [
    data.timestamp,
    data.amount,
    data.currency,
    data.type,
    data.category,
    data.subcategory,
    data.payment_method,
    data.account,
    data.merchant_or_counterparty,
    data.tags,
    data.note
  ];

  sheet.appendRow(rowData);
}

// ==========================================
//   Telegram 工具
// ==========================================
function sendMessage(chatId, text) {
  const url =
    `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;

  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
  });
}

function sendChatAction(chatId, action) {
  const url =
    `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendChatAction`;

  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, action: action })
  });
}

function sendStatus(chatId, text) {
  sendMessage(chatId, `🔹 ${text}`);
}

function formatReply(data) {
  return `✅ <b>記帳成功！</b>
💰 金額：${data.amount} ${data.currency}
🏷️ 分類：${data.category} - ${data.subcategory}
💳 支付：${data.payment_method || '未指定'}
🏪 對象：${data.merchant_or_counterparty || '未指定'}
📅 時間：${data.timestamp}`;
}

function resetWebhookBruteForce() {
  const token = CONFIG.TELEGRAM_BOT_TOKEN;
  const url = CONFIG.WEBHOOK_URL;
  
  //重新綁定並強制丟棄所有排隊中的訊息 (drop_pending_updates)
  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${url}&drop_pending_updates=true`);
  
  Logger.log("Webhook 已完成暴力重啟與清空隊列");
}

// ==========================================
//   Webhook 設定（手動執行一次）
// ==========================================
function setWebhook() {
  const webAppUrl = CONFIG.WEBHOOK_URL;
  const url =
    `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/setWebhook?url=${webAppUrl}`;

  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}
