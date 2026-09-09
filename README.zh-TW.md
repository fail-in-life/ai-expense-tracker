# AI 輔助個人記帳工具

這是一個我自己使用的小型記帳工具。

當初製作這個工具，是因為我覺得一般記帳 App 每次都需要手動選擇分類有點麻煩，所以想嘗試讓 AI 自動判斷記帳內容。

目前的流程是：

Telegram
→ Google Apps Script
→ Gemini API 分析內容
→ 寫入 Google Sheets
→ Telegram 回傳記帳結果

例如在 Telegram 輸入：

> 星巴克飲料 500 日圓

Gemini 會嘗試判斷金額、幣別、分類、付款方式、商家等資料，再將結果存入 Google Sheets。

## 使用技術

- Google Apps Script
- Google Sheets
- Telegram Bot API
- Gemini API
- JavaScript

## 製作過程

製作這個工具時，我原本並不熟悉 Google Apps Script，因此在實作過程中有使用 AI 協助。

我主要負責思考自己想解決的問題、設計整體流程，並透過測試與除錯讓 Telegram、Gemini 和 Google Sheets 能夠連接起來。

這個專案目前主要是為個人使用而製作，並不是正式的 production application。

## 目前已知問題

- 尚未完成 Telegram 使用者存取限制
- webhook 目前仍使用較簡單的重設方式處理重複訊息
- 指令功能尚未完成
- AI 自動分類偶爾可能判斷錯誤

之後有時間會再逐步改善。
