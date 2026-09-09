# AI-Assisted Personal Expense Tracker

A small personal expense-tracking tool that connects Telegram, Google Apps Script, the Gemini API, and Google Sheets.

I originally built this project because I wanted a simpler way to record daily expenses without manually selecting categories every time.

## What it does

The basic flow is:

Telegram message  
→ Google Apps Script  
→ Gemini analyzes the expense  
→ Structured data is saved to Google Sheets  
→ Telegram sends a confirmation message

For example, I can send a simple message such as:

> Starbucks drink 500 yen

The tool attempts to identify information such as:

- Amount
- Currency
- Expense type
- Category
- Payment method
- Account
- Merchant
- Tags
- Original note

The result is then saved as a new row in Google Sheets.

## Technologies

- Google Apps Script
- Google Sheets
- Telegram Bot API
- Gemini API
- JavaScript

## Why I built it

This was originally a personal project rather than a production application.

I was not familiar with Google Apps Script when I started, so I used AI assistance while figuring out how the different services could connect and work together.

The project gave me practical experience with API integration, testing, troubleshooting, and working around limitations.

## Configuration

Sensitive values are not stored directly in the source code.

The following values are stored using Google Apps Script Script Properties:

- `GEMINI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `SHEET_ID`
- `WEBHOOK_URL`

Anyone using this project should provide their own API keys, Telegram bot, Google Sheet, and Apps Script deployment.

## Security

This project was designed for personal use.

API keys and tokens are stored outside the source code using Script Properties so they are not included in the repository.

User access control is not currently implemented and should be added before using the project in a shared or public environment.

## Known limitations

- User authentication / access control is not yet implemented.
- The current webhook reset workaround uses `drop_pending_updates`, which may discard queued messages.
- Slash-command handling is incomplete.
- AI-generated categorization may sometimes be incorrect.
- The project was designed for a single user's personal use, not for production deployment.

## Future improvements

- Add Telegram user allowlisting
- Improve duplicate-update handling
- Remove the webhook reset workaround
- Improve validation of Gemini responses
- Make user preferences easier to configure

## Status

The project is currently functional for my personal use.