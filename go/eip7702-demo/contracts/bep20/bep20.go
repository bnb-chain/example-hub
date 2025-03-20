// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package bep20

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
)

// Bep20MetaData contains all meta data concerning the Bep20 contract.
var Bep20MetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[{\"internalType\":\"string\",\"name\":\"_name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"_symbol\",\"type\":\"string\"},{\"internalType\":\"uint8\",\"name\":\"_decimals\",\"type\":\"uint8\"},{\"internalType\":\"uint256\",\"name\":\"_totalSupply\",\"type\":\"uint256\"}],\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"spender\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"value\",\"type\":\"uint256\"}],\"name\":\"Approval\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"from\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"value\",\"type\":\"uint256\"}],\"name\":\"Transfer\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"name\":\"allowance\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"spender\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"value\",\"type\":\"uint256\"}],\"name\":\"approve\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"name\":\"balanceOf\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"decimals\",\"outputs\":[{\"internalType\":\"uint8\",\"name\":\"\",\"type\":\"uint8\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getOwner\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"name\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"owner\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"symbol\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"totalSupply\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"value\",\"type\":\"uint256\"}],\"name\":\"transfer\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"from\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"value\",\"type\":\"uint256\"}],\"name\":\"transferFrom\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
	Bin: "0x60806040523480156200001157600080fd5b5060405162001656380380620016568339818101604052810190620000379190620003eb565b83600090805190602001906200004f92919062000125565b5082600190805190602001906200006892919062000125565b5081600260006101000a81548160ff021916908360ff160217905550806003819055506a52b7d2dcc80cd2e4000000600560003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000208190555033600460006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505050505062000500565b8280546200013390620004ca565b90600052602060002090601f016020900481019282620001575760008555620001a3565b82601f106200017257805160ff1916838001178555620001a3565b82800160010185558215620001a3579182015b82811115620001a257825182559160200191906001019062000185565b5b509050620001b29190620001b6565b5090565b5b80821115620001d1576000816000905550600101620001b7565b5090565b6000604051905090565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6200023e82620001f3565b810181811067ffffffffffffffff8211171562000260576200025f62000204565b5b80604052505050565b600062000275620001d5565b905062000283828262000233565b919050565b600067ffffffffffffffff821115620002a657620002a562000204565b5b620002b182620001f3565b9050602081019050919050565b60005b83811015620002de578082015181840152602081019050620002c1565b83811115620002ee576000848401525b50505050565b60006200030b620003058462000288565b62000269565b9050828152602081018484840111156200032a5762000329620001ee565b5b62000337848285620002be565b509392505050565b600082601f830112620003575762000356620001e9565b5b815162000369848260208601620002f4565b91505092915050565b600060ff82169050919050565b6200038a8162000372565b81146200039657600080fd5b50565b600081519050620003aa816200037f565b92915050565b6000819050919050565b620003c581620003b0565b8114620003d157600080fd5b50565b600081519050620003e581620003ba565b92915050565b60008060008060808587031215620004085762000407620001df565b5b600085015167ffffffffffffffff811115620004295762000428620001e4565b5b62000437878288016200033f565b945050602085015167ffffffffffffffff8111156200045b576200045a620001e4565b5b62000469878288016200033f565b93505060406200047c8782880162000399565b92505060606200048f87828801620003d4565b91505092959194509250565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b60006002820490506001821680620004e357607f821691505b60208210811415620004fa57620004f96200049b565b5b50919050565b61114680620005106000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c806370a082311161007157806370a0823114610168578063893d20e8146101985780638da5cb5b146101b657806395d89b41146101d4578063a9059cbb146101f2578063dd62ed3e14610222576100a9565b806306fdde03146100ae578063095ea7b3146100cc57806318160ddd146100fc57806323b872dd1461011a578063313ce5671461014a575b600080fd5b6100b6610252565b6040516100c39190610b7e565b60405180910390f35b6100e660048036038101906100e19190610c39565b6102e0565b6040516100f39190610c94565b60405180910390f35b6101046103d2565b6040516101119190610cbe565b60405180910390f35b610134600480360381019061012f9190610cd9565b6103d8565b6040516101419190610c94565b60405180910390f35b6101526107a9565b60405161015f9190610d48565b60405180910390f35b610182600480360381019061017d9190610d63565b6107bc565b60405161018f9190610cbe565b60405180910390f35b6101a06107d4565b6040516101ad9190610d9f565b60405180910390f35b6101be6107fe565b6040516101cb9190610d9f565b60405180910390f35b6101dc610824565b6040516101e99190610b7e565b60405180910390f35b61020c60048036038101906102079190610c39565b6108b2565b6040516102199190610c94565b60405180910390f35b61023c60048036038101906102379190610dba565b610ac0565b6040516102499190610cbe565b60405180910390f35b6000805461025f90610e29565b80601f016020809104026020016040519081016040528092919081815260200182805461028b90610e29565b80156102d85780601f106102ad576101008083540402835291602001916102d8565b820191906000526020600020905b8154815290600101906020018083116102bb57829003601f168201915b505050505081565b600081600660003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516103c09190610cbe565b60405180910390a36001905092915050565b60035481565b60008073ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff161415610449576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161044090610ecd565b60405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1614156104b9576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104b090610f5f565b60405180910390fd5b81600560008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054101561053b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161053290610fcb565b60405180910390fd5b81600660008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205410156105fa576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105f190611037565b60405180910390fd5b81600560008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546106499190611086565b9250508190555081600560008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825461069f91906110ba565b9250508190555081600660008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546107329190611086565b925050819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040516107969190610cbe565b60405180910390a3600190509392505050565b600260009054906101000a900460ff1681565b60056020528060005260406000206000915090505481565b6000600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6001805461083190610e29565b80601f016020809104026020016040519081016040528092919081815260200182805461085d90610e29565b80156108aa5780601f1061087f576101008083540402835291602001916108aa565b820191906000526020600020905b81548152906001019060200180831161088d57829003601f168201915b505050505081565b60008073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff161415610923576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161091a90610f5f565b60405180910390fd5b81600560003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205410156109a5576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161099c90610fcb565b60405180910390fd5b81600560003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546109f49190611086565b9250508190555081600560008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000828254610a4a91906110ba565b925050819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef84604051610aae9190610cbe565b60405180910390a36001905092915050565b6006602052816000526040600020602052806000526040600020600091509150505481565b600081519050919050565b600082825260208201905092915050565b60005b83811015610b1f578082015181840152602081019050610b04565b83811115610b2e576000848401525b50505050565b6000601f19601f8301169050919050565b6000610b5082610ae5565b610b5a8185610af0565b9350610b6a818560208601610b01565b610b7381610b34565b840191505092915050565b60006020820190508181036000830152610b988184610b45565b905092915050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610bd082610ba5565b9050919050565b610be081610bc5565b8114610beb57600080fd5b50565b600081359050610bfd81610bd7565b92915050565b6000819050919050565b610c1681610c03565b8114610c2157600080fd5b50565b600081359050610c3381610c0d565b92915050565b60008060408385031215610c5057610c4f610ba0565b5b6000610c5e85828601610bee565b9250506020610c6f85828601610c24565b9150509250929050565b60008115159050919050565b610c8e81610c79565b82525050565b6000602082019050610ca96000830184610c85565b92915050565b610cb881610c03565b82525050565b6000602082019050610cd36000830184610caf565b92915050565b600080600060608486031215610cf257610cf1610ba0565b5b6000610d0086828701610bee565b9350506020610d1186828701610bee565b9250506040610d2286828701610c24565b9150509250925092565b600060ff82169050919050565b610d4281610d2c565b82525050565b6000602082019050610d5d6000830184610d39565b92915050565b600060208284031215610d7957610d78610ba0565b5b6000610d8784828501610bee565b91505092915050565b610d9981610bc5565b82525050565b6000602082019050610db46000830184610d90565b92915050565b60008060408385031215610dd157610dd0610ba0565b5b6000610ddf85828601610bee565b9250506020610df085828601610bee565b9150509250929050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b60006002820490506001821680610e4157607f821691505b60208210811415610e5557610e54610dfa565b5b50919050565b7f45524332303a207472616e736665722066726f6d20746865207a65726f20616460008201527f6472657373000000000000000000000000000000000000000000000000000000602082015250565b6000610eb7602583610af0565b9150610ec282610e5b565b604082019050919050565b60006020820190508181036000830152610ee681610eaa565b9050919050565b7f45524332303a207472616e7366657220746f20746865207a65726f206164647260008201527f6573730000000000000000000000000000000000000000000000000000000000602082015250565b6000610f49602383610af0565b9150610f5482610eed565b604082019050919050565b60006020820190508181036000830152610f7881610f3c565b9050919050565b7f45524332303a20696e73756666696369656e742062616c616e63650000000000600082015250565b6000610fb5601b83610af0565b9150610fc082610f7f565b602082019050919050565b60006020820190508181036000830152610fe481610fa8565b9050919050565b7f45524332303a20696e73756666696369656e7420616c6c6f77616e6365000000600082015250565b6000611021601d83610af0565b915061102c82610feb565b602082019050919050565b6000602082019050818103600083015261105081611014565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061109182610c03565b915061109c83610c03565b9250828210156110af576110ae611057565b5b828203905092915050565b60006110c582610c03565b91506110d083610c03565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0382111561110557611104611057565b5b82820190509291505056fea2646970667358221220a678845f4049edf3d84e877c2748badb98fd130f5fb1570851bcc69f40d3a01364736f6c63430008090033",
}

// Bep20ABI is the input ABI used to generate the binding from.
// Deprecated: Use Bep20MetaData.ABI instead.
var Bep20ABI = Bep20MetaData.ABI

// Bep20Bin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use Bep20MetaData.Bin instead.
var Bep20Bin = Bep20MetaData.Bin

// DeployBep20 deploys a new Ethereum contract, binding an instance of Bep20 to it.
func DeployBep20(auth *bind.TransactOpts, backend bind.ContractBackend, _name string, _symbol string, _decimals uint8, _totalSupply *big.Int) (common.Address, *types.Transaction, *Bep20, error) {
	parsed, err := Bep20MetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(Bep20Bin), backend, _name, _symbol, _decimals, _totalSupply)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &Bep20{Bep20Caller: Bep20Caller{contract: contract}, Bep20Transactor: Bep20Transactor{contract: contract}, Bep20Filterer: Bep20Filterer{contract: contract}}, nil
}

// Bep20 is an auto generated Go binding around an Ethereum contract.
type Bep20 struct {
	Bep20Caller     // Read-only binding to the contract
	Bep20Transactor // Write-only binding to the contract
	Bep20Filterer   // Log filterer for contract events
}

// Bep20Caller is an auto generated read-only Go binding around an Ethereum contract.
type Bep20Caller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// Bep20Transactor is an auto generated write-only Go binding around an Ethereum contract.
type Bep20Transactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// Bep20Filterer is an auto generated log filtering Go binding around an Ethereum contract events.
type Bep20Filterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// Bep20Session is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type Bep20Session struct {
	Contract     *Bep20            // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// Bep20CallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type Bep20CallerSession struct {
	Contract *Bep20Caller  // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts // Call options to use throughout this session
}

// Bep20TransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type Bep20TransactorSession struct {
	Contract     *Bep20Transactor  // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// Bep20Raw is an auto generated low-level Go binding around an Ethereum contract.
type Bep20Raw struct {
	Contract *Bep20 // Generic contract binding to access the raw methods on
}

// Bep20CallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type Bep20CallerRaw struct {
	Contract *Bep20Caller // Generic read-only contract binding to access the raw methods on
}

// Bep20TransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type Bep20TransactorRaw struct {
	Contract *Bep20Transactor // Generic write-only contract binding to access the raw methods on
}

// NewBep20 creates a new instance of Bep20, bound to a specific deployed contract.
func NewBep20(address common.Address, backend bind.ContractBackend) (*Bep20, error) {
	contract, err := bindBep20(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &Bep20{Bep20Caller: Bep20Caller{contract: contract}, Bep20Transactor: Bep20Transactor{contract: contract}, Bep20Filterer: Bep20Filterer{contract: contract}}, nil
}

// NewBep20Caller creates a new read-only instance of Bep20, bound to a specific deployed contract.
func NewBep20Caller(address common.Address, caller bind.ContractCaller) (*Bep20Caller, error) {
	contract, err := bindBep20(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &Bep20Caller{contract: contract}, nil
}

// NewBep20Transactor creates a new write-only instance of Bep20, bound to a specific deployed contract.
func NewBep20Transactor(address common.Address, transactor bind.ContractTransactor) (*Bep20Transactor, error) {
	contract, err := bindBep20(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &Bep20Transactor{contract: contract}, nil
}

// NewBep20Filterer creates a new log filterer instance of Bep20, bound to a specific deployed contract.
func NewBep20Filterer(address common.Address, filterer bind.ContractFilterer) (*Bep20Filterer, error) {
	contract, err := bindBep20(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &Bep20Filterer{contract: contract}, nil
}

// bindBep20 binds a generic wrapper to an already deployed contract.
func bindBep20(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(Bep20ABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Bep20 *Bep20Raw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Bep20.Contract.Bep20Caller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Bep20 *Bep20Raw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Bep20.Contract.Bep20Transactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Bep20 *Bep20Raw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Bep20.Contract.Bep20Transactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Bep20 *Bep20CallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Bep20.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Bep20 *Bep20TransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Bep20.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Bep20 *Bep20TransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Bep20.Contract.contract.Transact(opts, method, params...)
}

// Allowance is a free data retrieval call binding the contract method 0xdd62ed3e.
//
// Solidity: function allowance(address , address ) view returns(uint256)
func (_Bep20 *Bep20Caller) Allowance(opts *bind.CallOpts, arg0 common.Address, arg1 common.Address) (*big.Int, error) {
	var out []interface{}
	err := _Bep20.contract.Call(opts, &out, "allowance", arg0, arg1)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// Allowance is a free data retrieval call binding the contract method 0xdd62ed3e.
//
// Solidity: function allowance(address , address ) view returns(uint256)
func (_Bep20 *Bep20Session) Allowance(arg0 common.Address, arg1 common.Address) (*big.Int, error) {
	return _Bep20.Contract.Allowance(&_Bep20.CallOpts, arg0, arg1)
}

// Allowance is a free data retrieval call binding the contract method 0xdd62ed3e.
//
// Solidity: function allowance(address , address ) view returns(uint256)
func (_Bep20 *Bep20CallerSession) Allowance(arg0 common.Address, arg1 common.Address) (*big.Int, error) {
	return _Bep20.Contract.Allowance(&_Bep20.CallOpts, arg0, arg1)
}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address ) view returns(uint256)
func (_Bep20 *Bep20Caller) BalanceOf(opts *bind.CallOpts, arg0 common.Address) (*big.Int, error) {
	var out []interface{}
	err := _Bep20.contract.Call(opts, &out, "balanceOf", arg0)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address ) view returns(uint256)
func (_Bep20 *Bep20Session) BalanceOf(arg0 common.Address) (*big.Int, error) {
	return _Bep20.Contract.BalanceOf(&_Bep20.CallOpts, arg0)
}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address ) view returns(uint256)
func (_Bep20 *Bep20CallerSession) BalanceOf(arg0 common.Address) (*big.Int, error) {
	return _Bep20.Contract.BalanceOf(&_Bep20.CallOpts, arg0)
}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_Bep20 *Bep20Caller) Decimals(opts *bind.CallOpts) (uint8, error) {
	var out []interface{}
	err := _Bep20.contract.Call(opts, &out, "decimals")

	if err != nil {
		return *new(uint8), err
	}

	out0 := *abi.ConvertType(out[0], new(uint8)).(*uint8)

	return out0, err

}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_Bep20 *Bep20Session) Decimals() (uint8, error) {
	return _Bep20.Contract.Decimals(&_Bep20.CallOpts)
}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_Bep20 *Bep20CallerSession) Decimals() (uint8, error) {
	return _Bep20.Contract.Decimals(&_Bep20.CallOpts)
}

// GetOwner is a free data retrieval call binding the contract method 0x893d20e8.
//
// Solidity: function getOwner() view returns(address)
func (_Bep20 *Bep20Caller) GetOwner(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _Bep20.contract.Call(opts, &out, "getOwner")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetOwner is a free data retrieval call binding the contract method 0x893d20e8.
//
// Solidity: function getOwner() view returns(address)
func (_Bep20 *Bep20Session) GetOwner() (common.Address, error) {
	return _Bep20.Contract.GetOwner(&_Bep20.CallOpts)
}

// GetOwner is a free data retrieval call binding the contract method 0x893d20e8.
//
// Solidity: function getOwner() view returns(address)
func (_Bep20 *Bep20CallerSession) GetOwner() (common.Address, error) {
	return _Bep20.Contract.GetOwner(&_Bep20.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_Bep20 *Bep20Caller) Name(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _Bep20.contract.Call(opts, &out, "name")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_Bep20 *Bep20Session) Name() (string, error) {
	return _Bep20.Contract.Name(&_Bep20.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_Bep20 *Bep20CallerSession) Name() (string, error) {
	return _Bep20.Contract.Name(&_Bep20.CallOpts)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_Bep20 *Bep20Caller) Owner(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _Bep20.contract.Call(opts, &out, "owner")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_Bep20 *Bep20Session) Owner() (common.Address, error) {
	return _Bep20.Contract.Owner(&_Bep20.CallOpts)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_Bep20 *Bep20CallerSession) Owner() (common.Address, error) {
	return _Bep20.Contract.Owner(&_Bep20.CallOpts)
}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_Bep20 *Bep20Caller) Symbol(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _Bep20.contract.Call(opts, &out, "symbol")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_Bep20 *Bep20Session) Symbol() (string, error) {
	return _Bep20.Contract.Symbol(&_Bep20.CallOpts)
}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_Bep20 *Bep20CallerSession) Symbol() (string, error) {
	return _Bep20.Contract.Symbol(&_Bep20.CallOpts)
}

// TotalSupply is a free data retrieval call binding the contract method 0x18160ddd.
//
// Solidity: function totalSupply() view returns(uint256)
func (_Bep20 *Bep20Caller) TotalSupply(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _Bep20.contract.Call(opts, &out, "totalSupply")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// TotalSupply is a free data retrieval call binding the contract method 0x18160ddd.
//
// Solidity: function totalSupply() view returns(uint256)
func (_Bep20 *Bep20Session) TotalSupply() (*big.Int, error) {
	return _Bep20.Contract.TotalSupply(&_Bep20.CallOpts)
}

// TotalSupply is a free data retrieval call binding the contract method 0x18160ddd.
//
// Solidity: function totalSupply() view returns(uint256)
func (_Bep20 *Bep20CallerSession) TotalSupply() (*big.Int, error) {
	return _Bep20.Contract.TotalSupply(&_Bep20.CallOpts)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address spender, uint256 value) returns(bool)
func (_Bep20 *Bep20Transactor) Approve(opts *bind.TransactOpts, spender common.Address, value *big.Int) (*types.Transaction, error) {
	return _Bep20.contract.Transact(opts, "approve", spender, value)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address spender, uint256 value) returns(bool)
func (_Bep20 *Bep20Session) Approve(spender common.Address, value *big.Int) (*types.Transaction, error) {
	return _Bep20.Contract.Approve(&_Bep20.TransactOpts, spender, value)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address spender, uint256 value) returns(bool)
func (_Bep20 *Bep20TransactorSession) Approve(spender common.Address, value *big.Int) (*types.Transaction, error) {
	return _Bep20.Contract.Approve(&_Bep20.TransactOpts, spender, value)
}

// Transfer is a paid mutator transaction binding the contract method 0xa9059cbb.
//
// Solidity: function transfer(address to, uint256 value) returns(bool)
func (_Bep20 *Bep20Transactor) Transfer(opts *bind.TransactOpts, to common.Address, value *big.Int) (*types.Transaction, error) {
	return _Bep20.contract.Transact(opts, "transfer", to, value)
}

// Transfer is a paid mutator transaction binding the contract method 0xa9059cbb.
//
// Solidity: function transfer(address to, uint256 value) returns(bool)
func (_Bep20 *Bep20Session) Transfer(to common.Address, value *big.Int) (*types.Transaction, error) {
	return _Bep20.Contract.Transfer(&_Bep20.TransactOpts, to, value)
}

// Transfer is a paid mutator transaction binding the contract method 0xa9059cbb.
//
// Solidity: function transfer(address to, uint256 value) returns(bool)
func (_Bep20 *Bep20TransactorSession) Transfer(to common.Address, value *big.Int) (*types.Transaction, error) {
	return _Bep20.Contract.Transfer(&_Bep20.TransactOpts, to, value)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 value) returns(bool)
func (_Bep20 *Bep20Transactor) TransferFrom(opts *bind.TransactOpts, from common.Address, to common.Address, value *big.Int) (*types.Transaction, error) {
	return _Bep20.contract.Transact(opts, "transferFrom", from, to, value)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 value) returns(bool)
func (_Bep20 *Bep20Session) TransferFrom(from common.Address, to common.Address, value *big.Int) (*types.Transaction, error) {
	return _Bep20.Contract.TransferFrom(&_Bep20.TransactOpts, from, to, value)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 value) returns(bool)
func (_Bep20 *Bep20TransactorSession) TransferFrom(from common.Address, to common.Address, value *big.Int) (*types.Transaction, error) {
	return _Bep20.Contract.TransferFrom(&_Bep20.TransactOpts, from, to, value)
}

// Bep20ApprovalIterator is returned from FilterApproval and is used to iterate over the raw logs and unpacked data for Approval events raised by the Bep20 contract.
type Bep20ApprovalIterator struct {
	Event *Bep20Approval // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *Bep20ApprovalIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(Bep20Approval)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(Bep20Approval)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *Bep20ApprovalIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *Bep20ApprovalIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// Bep20Approval represents a Approval event raised by the Bep20 contract.
type Bep20Approval struct {
	Owner   common.Address
	Spender common.Address
	Value   *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterApproval is a free log retrieval operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed spender, uint256 value)
func (_Bep20 *Bep20Filterer) FilterApproval(opts *bind.FilterOpts, owner []common.Address, spender []common.Address) (*Bep20ApprovalIterator, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var spenderRule []interface{}
	for _, spenderItem := range spender {
		spenderRule = append(spenderRule, spenderItem)
	}

	logs, sub, err := _Bep20.contract.FilterLogs(opts, "Approval", ownerRule, spenderRule)
	if err != nil {
		return nil, err
	}
	return &Bep20ApprovalIterator{contract: _Bep20.contract, event: "Approval", logs: logs, sub: sub}, nil
}

// WatchApproval is a free log subscription operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed spender, uint256 value)
func (_Bep20 *Bep20Filterer) WatchApproval(opts *bind.WatchOpts, sink chan<- *Bep20Approval, owner []common.Address, spender []common.Address) (event.Subscription, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var spenderRule []interface{}
	for _, spenderItem := range spender {
		spenderRule = append(spenderRule, spenderItem)
	}

	logs, sub, err := _Bep20.contract.WatchLogs(opts, "Approval", ownerRule, spenderRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(Bep20Approval)
				if err := _Bep20.contract.UnpackLog(event, "Approval", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseApproval is a log parse operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed spender, uint256 value)
func (_Bep20 *Bep20Filterer) ParseApproval(log types.Log) (*Bep20Approval, error) {
	event := new(Bep20Approval)
	if err := _Bep20.contract.UnpackLog(event, "Approval", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// Bep20TransferIterator is returned from FilterTransfer and is used to iterate over the raw logs and unpacked data for Transfer events raised by the Bep20 contract.
type Bep20TransferIterator struct {
	Event *Bep20Transfer // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *Bep20TransferIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(Bep20Transfer)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(Bep20Transfer)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *Bep20TransferIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *Bep20TransferIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// Bep20Transfer represents a Transfer event raised by the Bep20 contract.
type Bep20Transfer struct {
	From  common.Address
	To    common.Address
	Value *big.Int
	Raw   types.Log // Blockchain specific contextual infos
}

// FilterTransfer is a free log retrieval operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 value)
func (_Bep20 *Bep20Filterer) FilterTransfer(opts *bind.FilterOpts, from []common.Address, to []common.Address) (*Bep20TransferIterator, error) {

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _Bep20.contract.FilterLogs(opts, "Transfer", fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return &Bep20TransferIterator{contract: _Bep20.contract, event: "Transfer", logs: logs, sub: sub}, nil
}

// WatchTransfer is a free log subscription operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 value)
func (_Bep20 *Bep20Filterer) WatchTransfer(opts *bind.WatchOpts, sink chan<- *Bep20Transfer, from []common.Address, to []common.Address) (event.Subscription, error) {

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _Bep20.contract.WatchLogs(opts, "Transfer", fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(Bep20Transfer)
				if err := _Bep20.contract.UnpackLog(event, "Transfer", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseTransfer is a log parse operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 value)
func (_Bep20 *Bep20Filterer) ParseTransfer(log types.Log) (*Bep20Transfer, error) {
	event := new(Bep20Transfer)
	if err := _Bep20.contract.UnpackLog(event, "Transfer", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
