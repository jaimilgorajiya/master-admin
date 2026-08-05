import ResellerLedger from "../models/resellerLedger.model.js";

class LedgerService {
  /**
   * Updates or creates the monthly ledger for a reseller when a successful transaction occurs.
   */
  async updateLedger(transaction) {
    const { resellerId, amount, resellerCommission, createdAt } = transaction;
    if (!resellerId) return;

    const date = new Date(createdAt || Date.now());
    const month = date.getMonth() + 1; // 1-12
    const year = date.getFullYear();

    let ledger = await ResellerLedger.findOne({ resellerId, month, year });

    if (!ledger) {
      ledger = new ResellerLedger({
        resellerId,
        month,
        year,
        totalRevenue: 0,
        totalCommission: 0,
        paidAmount: 0,
        pendingAmount: 0,
        transactions: [],
        status: "pending"
      });
    }

    ledger.totalRevenue += amount;
    ledger.totalCommission += resellerCommission;
    ledger.pendingAmount = ledger.totalCommission - ledger.paidAmount;
    
    ledger.transactions.push({
      transactionId: transaction._id,
      amount,
      commission: resellerCommission,
      date: date
    });

    // Auto-update status if it was partially paid or fully paid (though usually new transactions make it partial)
    if (ledger.pendingAmount <= 0 && ledger.totalCommission > 0) {
      ledger.status = "paid";
    } else if (ledger.paidAmount > 0) {
      ledger.status = "partial_paid";
    } else {
      ledger.status = "pending";
    }

    await ledger.save();
    return ledger;
  }

  /**
   * Records a payout for a reseller in a specific ledger.
   */
  async recordPayout(resellerId, month, year, amount) {
    const ledger = await ResellerLedger.findOne({ resellerId, month, year });
    if (!ledger) throw new Error("Ledger not found for specified month/year");

    ledger.paidAmount += amount;
    ledger.pendingAmount = ledger.totalCommission - ledger.paidAmount;

    ledger.payouts.push({
      amount,
      date: new Date()
    });

    if (ledger.pendingAmount <= 0) {
      ledger.status = "paid";
      ledger.pendingAmount = 0; // Ensure no negative pending
    } else if (ledger.paidAmount > 0) {
      ledger.status = "partial_paid";
    }

    await ledger.save();
    return ledger;
  }

  /**
   * Gets payout summary for all resellers for a specific month/year.
   */
  async getPayoutSummary(month, year) {
    return await ResellerLedger.find({ month, year }).populate('resellerId', 'name companyName email');
  }

  /**
   * Gets ledger history for a specific reseller.
   */
  async getResellerHistory(resellerId) {
    return await ResellerLedger.find({ resellerId }).sort({ year: -1, month: -1 });
  }
}

export default new LedgerService();
