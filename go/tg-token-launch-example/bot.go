package main

import (
	"log"
	"os"
	"strings"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api"
)

var userTokens = make(map[int64]string) // telegram user ID -> token address

func StartTelegramBot() {
	bot, err := tgbotapi.NewBotAPI(os.Getenv("TG_BOT_TOKEN"))
	if err != nil {
		log.Panic(err)
	}
	bot.Debug = false

	u := tgbotapi.NewUpdate(0)
	u.Timeout = 60
	updates, _ := bot.GetUpdatesChan(u)

	for update := range updates {
		if update.Message == nil {
			continue
		}

		userID := update.Message.From.ID
		args := strings.Split(update.Message.Text, " ")

		switch {
		case strings.HasPrefix(update.Message.Text, "/deploy"):
			if len(args) != 3 {
				bot.Send(tgbotapi.NewMessage(update.Message.Chat.ID, "Usage: /deploy <TokenName> <Symbol>"))
				continue
			}
			name := args[1]
			symbol := args[2]

			tokenAddress, err := DeployToken(name, symbol)
			if err != nil {
				bot.Send(tgbotapi.NewMessage(update.Message.Chat.ID, "Error deploying token: "+err.Error()))
			} else {
				userTokens[userID] = tokenAddress
				bot.Send(tgbotapi.NewMessage(update.Message.Chat.ID, "✅ Token deployed: "+tokenAddress))
			}

		case strings.HasPrefix(update.Message.Text, "/faucet"):
			if len(args) != 2 {
				bot.Send(tgbotapi.NewMessage(update.Message.Chat.ID, "Usage: /faucet <address>"))
				continue
			}
			tokenAddr := userTokens[userID]
			if tokenAddr == "" {
				bot.Send(tgbotapi.NewMessage(update.Message.Chat.ID, "❌ You need to /deploy a token first"))
				continue
			}
			txHash, err := SendToken(tokenAddr, args[1])
			if err != nil {
				bot.Send(tgbotapi.NewMessage(update.Message.Chat.ID, "Error: "+err.Error()))
			} else {
				bot.Send(tgbotapi.NewMessage(update.Message.Chat.ID, "Sent! TX: "+txHash))
			}

		case strings.HasPrefix(update.Message.Text, "/balance"):
			if len(args) != 2 {
				bot.Send(tgbotapi.NewMessage(update.Message.Chat.ID, "Usage: /balance <address>"))
				continue
			}
			tokenAddr := userTokens[userID]
			if tokenAddr == "" {
				bot.Send(tgbotapi.NewMessage(update.Message.Chat.ID, "❌ You need to /deploy a token first"))
				continue
			}
			balance, err := GetTokenBalance(tokenAddr, args[1])
			if err != nil {
				bot.Send(tgbotapi.NewMessage(update.Message.Chat.ID, "Error: "+err.Error()))
			} else {
				bot.Send(tgbotapi.NewMessage(update.Message.Chat.ID, "Balance: "+balance))
			}

		default:
			bot.Send(tgbotapi.NewMessage(update.Message.Chat.ID, "Available commands:\n/deploy <Name> <Symbol>\n/faucet <address>\n/balance <address>"))
		}
	}
}
