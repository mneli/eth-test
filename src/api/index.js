import { version } from '../../package.json';
import { Router } from 'express';
import facets from './facets';
import Web3 from 'web3';
import Tx from 'ethereumjs-tx';

export default ({ config, db }) => {

	const web3 = new Web3(new Web3.providers.HttpProvider('https://rinkeby.infura.io/'));

	let api = Router();

	// mount the facets resource
	api.use('/facets', facets({ config, db }));

	// perhaps expose some API metadata at the root
	api.get('/', (req, res) => {
		res.json({ version });
	});

	api.get('/createWallet', (req, res) => {
		var newAccount = web3.eth.accounts.create();
		var newWallet = {
			privateKey: newAccount.privateKey,
			address: newAccount.address
		}
		res.json(newWallet);
	})

	api.get('/getBalance/:param', (req, res) => {
		web3.eth.getBalance(req.params.param)
			.then(balance => res.json(web3.utils.fromWei(balance, 'ether'))) //convert to ETH before sending
			.catch(err => res.json(err));
	})

	api.post('/transaction', (req, res) => {
		var privateKey = new Buffer(req.body.privateKey, 'hex');
		var destination = req.body.destination;
		var amount = web3.utils.toHex(web3.utils.toWei(req.body.amount));
		var account = web3.eth.accounts.privateKeyToAccount(req.body.privateKey);
		var gas = web3.utils.toHex(req.body.gas) || '0x5208'
		var gasPrice = web3.utils.toHex(req.body.gasPrice) || '0x09184e72a000'
		var gasLimit = web3.utils.toHex(req.body.gasLimit) || '0x2710'

		web3.eth.getTransactionCount(account.address)
			.then(nonce => {

				var rawTx = {
					nonce: nonce,
					gas: gas,
					gasPrice: gasPrice,
					gasLimit: gasLimit,
					to: destination,
					value: amount,
					from: account.address
				}

				var tx = new Tx(rawTx);
				tx.sign(privateKey);

				var serializedTx = tx.serialize();
				web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
					.on('receipt', (response) => {
						res.json(response);
					})
					.catch(err => {
						res.json(err);
					})
			})
			.catch(err => {
				res.json(err);
			})
	})
	return api;
}
