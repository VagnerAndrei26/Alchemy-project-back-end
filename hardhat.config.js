require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_GOERLI_RPC_URL
      }
    },
},
  gasReporter:{
    currency: "EUR",
    enabled:(process.env.ETH_GAS_PRICE) ? true : false
  }
}
