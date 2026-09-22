import { marketStore } from "./src/services/marketStore";

async function runTests() {
  console.log("=== Testing Axiom Wallet Trading & Balance System ===");

  // 1. Check Initial State
  const initialBalances = marketStore.getBalances();
  console.log("Initial Balances:", initialBalances);

  if (initialBalances["USDT"]?.bal !== 20 || initialBalances["USDC"]?.bal !== 0) {
    throw new Error(`Expected USDT: 20 and USDC: 0, got USDT: ${initialBalances["USDT"]?.bal}, USDC: ${initialBalances["USDC"]?.bal}`);
  }

  // Check no bought coins
  const nonStableHoldings = Object.entries(initialBalances).filter(([s, b]: [string, any]) => s !== "USDT" && s !== "USDC" && b.bal > 0.000001);
  if (nonStableHoldings.length > 0) {
    throw new Error(`Expected 0 bought coins, but found: ${JSON.stringify(nonStableHoldings)}`);
  }
  console.log("✓ Initial cash is strictly $20.00 USDT, Buys count is 0.");

  // 2. Check BATON token
  const baton = marketStore.getToken("BATON");
  if (!baton) {
    throw new Error("BATON token not found in tokens list!");
  }
  console.log(`✓ BATON token verified. Name: ${baton.name}, Price: ${baton.price} ($${baton.numericPrice})`);

  // 3. Test Market Buy of BATON with $5
  console.log("\n--- Placing Market Buy of $5.00 BATON ---");
  const buyRes = marketStore.placeOrder({
    sym: "BATON",
    side: "Buy",
    amount: 5,
  });
  console.log("Buy Result:", buyRes);
  if (!buyRes.success) throw new Error("Market buy failed: " + buyRes.message);

  const posAfterBuy = marketStore.getUserPosition("BATON");
  console.log("BATON Position:", posAfterBuy);
  if (posAfterBuy.invested !== 5 || posAfterBuy.bal <= 0) {
    throw new Error("Position mismatch after buy!");
  }
  const balancesAfterBuy = marketStore.getBalances();
  console.log("Cash remaining:", balancesAfterBuy["USDT"]?.bal);
  if (Math.abs((balancesAfterBuy["USDT"]?.bal || 0) - 15) > 0.01) {
    throw new Error("Expected $15.00 USDT cash remaining!");
  }
  console.log("✓ Market Buy executed cleanly, $15.00 USDT remaining, BATON position acquired.");

  // 4. Test Limit Buy Order
  console.log("\n--- Placing Limit Buy Order for $4.00 BATON at 10% lower price ---");
  const targetBuyPrice = baton.numericPrice * 0.9;
  const limitRes = marketStore.placeLimitOrder({
    sym: "BATON",
    side: "Buy",
    amount: 4,
    targetPrice: targetBuyPrice,
  });
  console.log("Limit Buy Result:", limitRes);
  if (!limitRes.success) throw new Error("Limit buy failed: " + limitRes.message);

  const openOrders = marketStore.getPendingOrders("BATON");
  console.log("Open orders count:", openOrders.length);
  if (openOrders.length !== 1 || openOrders[0].type !== "Limit") {
    throw new Error("Pending limit order was not recorded!");
  }
  console.log("✓ Pending Limit Buy created in escrow.");

  // 5. Test Cancel Limit Order
  console.log("\n--- Cancelling Pending Limit Buy ---");
  const cancelRes = marketStore.cancelPendingOrder(openOrders[0].id);
  console.log("Cancel Result:", cancelRes);
  if (!cancelRes.success) throw new Error("Cancel failed: " + cancelRes.message);

  const balancesAfterCancel = marketStore.getBalances();
  console.log("Cash after cancel:", balancesAfterCancel["USDT"]?.bal);
  if (Math.abs((balancesAfterCancel["USDT"]?.bal || 0) - 15) > 0.01) {
    throw new Error("Escrow was not properly refunded!");
  }
  console.log("✓ Order cancelled and $4.00 cash refunded.");

  // 6. Test TP/SL Order
  console.log("\n--- Placing TP/SL Order for BATON holdings ---");
  const tpTarget = baton.numericPrice * 1.25; // +25%
  const slTarget = baton.numericPrice * 0.90; // -10%
  const tokensToProtect = posAfterBuy.bal * 0.5;
  const tpslRes = marketStore.placeTpSlOrder({
    sym: "BATON",
    amountTokens: tokensToProtect,
    tpPrice: tpTarget,
    slPrice: slTarget,
    tpPct: 25,
    slPct: 10,
  });
  console.log("TP/SL Result:", tpslRes);
  if (!tpslRes.success) throw new Error("TP/SL placement failed: " + tpslRes.message);

  const openOrdersAfterTpSl = marketStore.getPendingOrders("BATON");
  console.log("Open orders after TP/SL:", openOrdersAfterTpSl.length);
  if (openOrdersAfterTpSl.length !== 1 || openOrdersAfterTpSl[0].type !== "TP/SL") {
    throw new Error("TP/SL order not recorded!");
  }
  console.log("✓ TP/SL order placed with TP at +25% and SL at -10%.");

  // 6b. Test TP/SL Auto-execution on Pump!
  console.log("\n--- Testing TP Auto-Execution on +30% Pump ---");
  const usdtBeforePump = marketStore.getBalances()["USDT"]?.bal || 0;
  marketStore.pumpToken("BATON", 30);
  const openOrdersAfterPump = marketStore.getPendingOrders("BATON");
  console.log("Open orders after +30% pump:", openOrdersAfterPump.length);
  if (openOrdersAfterPump.length !== 0) {
    throw new Error("TP order was not triggered on pump!");
  }
  const usdtAfterPump = marketStore.getBalances()["USDT"]?.bal || 0;
  console.log("USDT before pump:", usdtBeforePump, "USDT after pump:", usdtAfterPump);
  if (usdtAfterPump <= usdtBeforePump) {
    throw new Error("Proceeds were not credited to USDT after Take Profit!");
  }
  console.log(`✓ Take Profit triggered cleanly on pump! Profit deposited to USDT ($${usdtAfterPump.toFixed(2)} cash).`);

  // 7. Test Reset to $20 Demo Cash
  console.log("\n--- Testing Hard Reset to $20 ---");
  const resetRes = marketStore.resetToDemoTwenty();
  console.log("Reset Result:", resetRes);
  const finalBalances = marketStore.getBalances();
  console.log("Final Balances:", finalBalances);
  if (finalBalances["USDT"]?.bal !== 20 || finalBalances["USDC"]?.bal !== 0) {
    throw new Error("Reset failed to set USDT to 20!");
  }
  const finalHoldings = Object.entries(finalBalances).filter(([s, b]: [string, any]) => s !== "USDT" && s !== "USDC" && b.bal > 0.000001);
  if (finalHoldings.length > 0) {
    throw new Error("Reset failed to clear bought holdings!");
  }
  console.log("✓ Reset verified: exactly $20.00 USDT cash and 0 bought coins!");

  // 8. Test Rugpull Loss Mechanics
  console.log("\n--- Testing Rugpull 100% Loss Mechanics ---");
  marketStore.placeOrder({ sym: "BATON", side: "Buy", amount: 15 });
  const midBal = marketStore.getBalances();
  console.log(`Cash after buying $15 BATON: $${midBal["USDT"].bal.toFixed(2)}`);

  console.log("Admin triggering rugpull on BATON...");
  marketStore.rugpullToken("BATON");

  const batonToken = marketStore.getToken("BATON");
  if (!batonToken?.is_rugged) throw new Error("BATON should be marked as rugged!");
  console.log(`BATON price after rug: ${batonToken.price}, numericPrice: ${batonToken.numericPrice}`);

  const userPos = marketStore.getUserPosition("BATON");
  console.log(`User position after rug: Value=$${userPos.currentVal}, PnL=$${userPos.pnlUsd}, PnLPct=${userPos.pnlPct}%`);
  if (userPos.currentVal !== 0 || userPos.pnlPct !== -100) {
    throw new Error(`Expected position value $0 and -100% PnL, got $${userPos.currentVal} and ${userPos.pnlPct}%`);
  }

  // Try to trade rugged token -> must fail
  const tryTradeRug = marketStore.placeOrder({ sym: "BATON", side: "Sell", amount: userPos.bal });
  console.log("Trading rugged token attempt result:", tryTradeRug.message);
  if (tryTradeRug.success) throw new Error("Trading rugged token should be blocked!");
  console.log("✓ Rugpulled token locked and trading blocked with 100% loss!");

  // 9. Test Contract Address Search
  console.log("\n--- Testing Contract Address Search ---");
  const searchQueries = [
    { query: "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE", expectedSym: "SOL" },
    { query: "0x99ac8ca7087fa4a2a1fb6357269965a2014abc35", expectedSym: "BTC" },
    { query: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", expectedSym: "BATON" },
    { query: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", expectedSym: "BONK" },
  ];

  for (const sq of searchQueries) {
    const found = marketStore.tokens.find(t => t.poolAddress?.toLowerCase() === sq.query.toLowerCase());
    if (!found || found.sym !== sq.expectedSym) {
      throw new Error(`Contract address search failed for ${sq.query}, expected ${sq.expectedSym}, found ${found?.sym}`);
    }
    console.log(`✓ Contract ${sq.query.substring(0, 10)}... resolved to $${found.sym}`);
  }

  // Final reset back to clean demo state
  marketStore.resetToDemoTwenty();
  console.log("\n🎉 ALL TESTS (INCLUDING RUGPULL LOSS & CONTRACT SEARCH) PASSED SUCCESSFULLY!");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
