const axios = require("axios");
const bsv = require("bsv");

const callbackWrapper = func => {
  return async (options, callback) => {
    try {
      result = await func(options);
      if (callback) callback(null, result);
      else return result;
    } catch (err) {
      if (callback) callback(err);
      else throw err;
    }
  };
};

const getErrorMessage = err => {
  let message = err.message;
  if (err.response && err.response.data) {
    message = err.response.data;
  }
  if (message.message) {
    message = message.message;
  }
  if (message.context) {
    message = message.context;
  }
  if (message.error) {
    message = message.error;
  }
  return message;
}

let insight;

const connect = options => {
  insight = axios.create(options);
};

connect({ baseURL: "https://api.bitindex.network/api/v3/main" });

module.exports.getUTXOs = async address => {
  console.log('Getting utxos');
  try {
    const res = await insight.post("/addrs/utxo", {
      addrs: address.toString()
    });
    return res.data;
  } catch (err) {
    throw new Error(`Failed to retrieve utxo's for ${address}: ${getErrorMessage(err)}`);
  }
};

module.exports.broadcastBlockchair = async (data, retry = true) => {
  try {
    const res = await axios.post("https://api.blockchair.com/bitcoin-sv/push/transaction", { data });
    return res.data ? res.data.data.transaction_hash : null;
  } catch (err) {
    console.error('Failed on Blockchair');
    console.error(getErrorMessage(err));
    if (retry) {
      console.error('Retring...');
      return await module.exports.broadcast(rawtx, false);
    }
    throw new Error(`Failed to broadcast transaction: ${getErrorMessage(err)}`);
  }
}

module.exports.broadcast = async (rawtx, retry = true) => {
  try {
    const res = await insight.post("/tx/send", { rawtx });
    return res.data ? res.data.txid : null;
  } catch (err) {
    console.error('Failed on BitIndex');
    console.error(getErrorMessage(err));
    if (retry) {
      console.error('Retring...');
      return await module.exports.broadcast(rawtx, false);
    } else {
      console.error('Using Blockchair...');
      return await module.exports.broadcastBlockchair(rawtx, false);
    }
    throw new Error(`Failed to broadcast transaction: ${getErrorMessage(err)}`);
  }
};

module.exports.build = callbackWrapper(async ({ data, safe, pay, utxos }) => {
  const tx = new bsv.Transaction();

  if (data && data.length) {
    const script = module.exports.createDataScript(data, safe);
    tx.addOutput(new bsv.Transaction.Output({ script, satoshis: 0 }));
  }

  if (pay) {
    const { fee, feeb = 1.0, key, to = [], filter } = pay;

    if (fee) tx.fee(fee);
    else tx.feePerKb(feeb * 1000);

    to.forEach(receiver => tx.to(receiver.address, receiver.value));

    if (key) {
      const privateKey = new bsv.PrivateKey(key);
      const address = privateKey.toAddress();
      tx.change(address);

      if (!utxos) utxos = await module.exports.getUTXOs(address);
      if (filter) utxos = filter(utxos);
      tx.from(utxos);

      tx.sign(privateKey);
    }
  }

  return tx;
});

module.exports.send = callbackWrapper(async options => {
  const tx = options.tx || (await module.exports.build(options));
  if (options.provider === 'blockchair') {
    return await module.exports.broadcastBlockchair(tx.serialize());
  }
  return await module.exports.broadcast(tx.serialize());
});

module.exports.createDataScript = (data, safe) => {
  if (typeof data === "string") return bsv.Script.fromHex(data);

  const s = new bsv.Script();

  // Add OP_RETURN
  if (safe) s.add(bsv.Opcode.OP_FALSE);
  s.add(bsv.Opcode.OP_RETURN);

  // Add data
  data.forEach(item => {
    if (typeof item === "object" && item.hasOwnProperty("op")) {
      s.add({ opcodenum: item.op });
      return;
    }

    if (typeof item === "string" && /^0x/i.test(item)) {
      // e.g. 0x6d02
      s.add(Buffer.from(item.slice(2), "hex"));
      return;
    }

    s.add(Buffer.from(item));
  });

  return s;
};
