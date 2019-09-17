const assert = require("assert");
const sinon = require("sinon");
const bsv = require("bsv");
const datapay = require("../index");

const sandbox = sinon.createSandbox();

// fake input data
const toAddress1 = "1DnFt3kHih4jkAbGYsF8wPhoisuM3vkWLN";
const toAddress2 = "1LTLNv4SCF9pjj73t5ZEt5fYrWWadwfMFB";
const privateKey = "Ky1WGEzN2Jn6CezPWdYMqTJzcBTJuFaMhna6wBpycg1wzVBUXcHC";
const utxos = [
  {
    txid: "8a06f5d5449c0f68291171ad1a7cc427db9bef5abb93998b40c999f5e933eb89",
    vout: 2,
    amount: 0.045,
    script: "76a914ee305aa2a75dbeff6f8f960eb1b7b16eb1d3b2df88ac"
  },
  {
    txid: "23cad3adb933c194b57b9d8db22a977b281f7279f040c319a9552c3378a70f5a",
    vout: 4,
    satoshis: 10000,
    scriptPubKey: "76a914ee305aa2a75dbeff6f8f960eb1b7b16eb1d3b2df88ac"
  }
];

describe("#createDataScript()", function() {
  describe("with a pushdata array", function() {
    it("should add an opcode", function() {
      const script = datapay.createDataScript([{ op: 78 }, "hello world"]);
      assert.equal(
        script.toASM(),
        "OP_RETURN OP_PUSHDATA4 68656c6c6f20776f726c64"
      );
    });

    it("should add a buffer", function() {
      const script = datapay.createDataScript([
        Buffer.from("abc"),
        "hello world"
      ]);

      assert.equal(script.toASM(), "OP_RETURN 616263 68656c6c6f20776f726c64");
    });

    it("should add a utf-8 string", function() {
      const script = datapay.createDataScript(["hello world"]);
      assert.equal(script.toASM(), "OP_RETURN 68656c6c6f20776f726c64");
    });

    it("should add a hex string", function() {
      const script = datapay.createDataScript(["0x6d02", "hello world"]);
      assert.equal(script.toASM(), "OP_RETURN 6d02 68656c6c6f20776f726c64");
    });

    it("should add OP_0 with safe option", function() {
      const script = datapay.createDataScript(["hello world"], true);
      assert.equal(script.toASM(), "0 OP_RETURN 68656c6c6f20776f726c64");
    });
  });

  it("should build from a hex string", function() {
    const script = datapay.createDataScript(
      "6a04366430320b68656c6c6f20776f726c64"
    );

    assert.equal(script.toASM(), "OP_RETURN 36643032 68656c6c6f20776f726c64");
  });
});

describe("#build()", function() {
  afterEach(function() {
    sandbox.restore();
  });

  describe("with callback", function() {
    it.skip("should build a transaction", function(done) {
      const options = {};
      datapay.build(options, (err, tx) => {
        done();
      });
    });

    it.skip("should handle getUTXOs error", function(done) {
      sandbox.stub(datapay, "getUTXOs").rejects();

      const options = { pay: { key: privateKey } };

      datapay.build(options, (err, tx) => {
        assert.ifError(err);
      });
    });
  });

  describe("with async/await", function() {
    it("should build a transaction", async function() {
      sandbox.stub(datapay, "getUTXOs").resolves(utxos);

      const options = { pay: { key: privateKey }, data: ["async", "await"] };
      const tx = await datapay.build(options);
      assert(tx.inputs.length, 2);
      assert(tx.outputs.length, 2);
      assert(tx.isFullySigned());
    });

    it("should handle getUTXOs error", async function() {
      sandbox.stub(datapay, "getUTXOs").rejects();

      const options = { pay: { key: privateKey } };
      await assert.rejects(async () => await datapay.build(options));
    });
  });

  it.skip("should support OP_0 OP_RETURN with safe option", async function() {});
  it.skip("should send output to address", async function() {});

  it.skip("should add change output", async function() {});

  it.skip("should add data output", async function() {});

  it.skip("should apply fixed fee", async function() {});

  it.skip("should apply custom fee rate", async function() {});

  it.skip("should filter utxo's", async function() {});
});

describe("#send()", function() {
  beforeEach(function() {
    sandbox.stub(datapay, "getUTXOs").resolves(utxos);
    sandbox.stub(datapay, "broadcast").resolves("faketxid");
  });

  afterEach(function() {
    sandbox.restore();
  });

  const tx = bsv.Transaction();
  const options = { pay: { key: privateKey } };

  describe("with callback", function() {
    it.skip("should broadcast a transaction", function(done) {});
    it.skip("should handle broadcast error", function(done) {});
  });

  describe("with async/await", function() {
    it.skip("should broadcast a transaction", async function() {});
    it.skip("should handle broadcast error", async function() {});
  });

  it("should build a transaction if not supplied", async function() {
    const buildSpy = sandbox.spy(datapay, "build");

    const options = { pay: { key: privateKey } };
    const txid = await datapay.send(options);

    assert.equal(txid, "faketxid", "transaction was not broadcast");
    assert(buildSpy.called, "a transaction was not built");
  });
});
