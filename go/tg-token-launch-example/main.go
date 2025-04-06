package main

import (
	"bnb-faucet-demo/utils"
)

func main() {
	utils.LoadEnv()
	StartTelegramBot()
}
