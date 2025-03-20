package bsc

import (
	"context"
	"crypto/ecdsa"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/holiman/uint256"
)

type Account struct {
	Addr       *common.Address
	PrivateKey *ecdsa.PrivateKey
	EthClient  *ethclient.Client
}

func NewAccount(client *ethclient.Client, privateKeyHex string) (*Account, error) {
	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return nil, err
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return nil, err
	}

	address := crypto.PubkeyToAddress(*publicKeyECDSA)
	return &Account{
		Addr:       &address,
		PrivateKey: privateKey,
		EthClient:  client,
	}, nil
}

func NewAcc(client *ethclient.Client) (*Account, error) {
	privateKey, err := crypto.GenerateKey()
	if err != nil {
		return nil, err
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return nil, err
	}

	address := crypto.PubkeyToAddress(*publicKeyECDSA)
	return &Account{
		Addr:       &address,
		PrivateKey: privateKey,
		EthClient:  client,
	}, nil
}

func (a *Account) BuildTransactOpts(nonce uint64, gasPrice *big.Int, gasLimit uint64) (*bind.TransactOpts, error) {
	var err error
	if nonce == 0 {
		nonce, err = a.EthClient.PendingNonceAt(context.Background(), *a.Addr)
		if err != nil {
			return nil, err
		}
	}

	if gasPrice == nil {
		gasPrice, err = a.EthClient.SuggestGasPrice(context.Background())
		if err != nil {
			return nil, err
		}
	}

	if gasLimit == 0 {
		gasLimit = 210000
	}

	chainID, err := a.EthClient.ChainID(context.Background())
	if err != nil {
		return nil, err
	}

	auth, err := bind.NewKeyedTransactorWithChainID(a.PrivateKey, chainID)
	if err != nil {
		return nil, err
	}

	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)
	auth.GasLimit = gasLimit
	auth.GasPrice = gasPrice

	return auth, nil
}

func (a *Account) GetReceipt(txHash common.Hash, timeout int64) *types.Receipt {
	for i := int64(0); i < timeout; i++ {
		receipt, err := a.EthClient.TransactionReceipt(context.Background(), txHash)
		if err == nil {
			return receipt
		}
		time.Sleep(time.Second)
	}
	return nil
}

func (ea *Account) SignEIP702Auth(contractAddress common.Address, chainId, nonce *big.Int) *types.SetCodeAuthorization {
	if chainId == nil {
		cId, err := ea.EthClient.ChainID(context.Background())
		if err != nil {
			return nil
		}
		chainId = cId
	}
	if nonce == nil {
		n, err := ea.EthClient.PendingNonceAt(context.Background(), *ea.Addr)
		if err != nil {
			return nil
		}
		nonce = big.NewInt(int64(n))
	}
	auth1, _ := types.SignSetCode(ea.PrivateKey, types.SetCodeAuthorization{
		ChainID: *uint256.MustFromBig(chainId),
		Address: contractAddress,
		Nonce:   nonce.Uint64(),
	})

	return &auth1
}

func (ea *Account) SendEIP7702Tx(opts *bind.TransactOpts, toAddr *common.Address, auth []types.SetCodeAuthorization, data []byte, accessList *types.AccessList) (*common.Hash, error) {
	if opts == nil {
		opts, _ = ea.BuildTransactOpts(0, nil, 0)
	}
	if opts.GasTipCap == nil {
		opts.GasFeeCap = opts.GasPrice
		opts.GasTipCap = opts.GasPrice
		opts.GasPrice = nil
	}
	chainId, err := ea.EthClient.ChainID(context.Background())
	if err != nil {
		return nil, err
	}
	if toAddr == nil {
		t := common.HexToAddress("0x000")
		toAddr = &t
	}
	eip7702Tx := &types.SetCodeTx{
		ChainID:   uint256.MustFromBig(chainId),
		Nonce:     opts.Nonce.Uint64(),
		GasTipCap: uint256.MustFromBig(opts.GasTipCap),
		GasFeeCap: uint256.MustFromBig(opts.GasFeeCap),
		Gas:       opts.GasLimit,
		To:        *toAddr,
		Value:     uint256.MustFromBig(opts.Value),
		Data:      data,
		AuthList:  auth,
	}

	if accessList != nil {
		eip7702Tx.AccessList = *accessList
	}

	signer := types.NewPragueSigner(chainId)

	// Sign the transaction with the sender's private key
	signedTx := types.MustSignNewTx(ea.PrivateKey, signer, eip7702Tx)

	// Send the transaction to the Ethereum network
	err = ea.EthClient.SendTransaction(context.Background(), signedTx)
	if err != nil {
		return nil, err
	}
	hash := signedTx.Hash()
	return &hash, nil
}
