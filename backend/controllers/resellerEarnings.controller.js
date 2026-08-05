import Reseller from "../models/reseller.model.js";
import Transaction from "../models/transaction.model.js";
import ResellerLedger from "../models/resellerLedger.model.js";
import LedgerService from "../services/ledger.service.js";

// Admin: Get all resellers payout summary for a month
export const getResellerEarningsSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const targetMonth = parseInt(month) || now.getMonth() + 1;
    const targetYear = parseInt(year) || now.getFullYear();

    const summary = await LedgerService.getPayoutSummary(targetMonth, targetYear);
    
    // Calculate dashboard totals for this specific month
    const ledgers = await ResellerLedger.find({ month: targetMonth, year: targetYear });
    const totalPayouts = ledgers.reduce((sum, l) => sum + l.totalCommission, 0);
    const netRevenue = ledgers.reduce((sum, l) => sum + (l.totalRevenue - l.totalCommission), 0);

    res.status(200).json({
      success: true,
      summary,
      stats: {
        totalPayouts,
        netRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Process Payout
export const processPayout = async (req, res) => {
  try {
    const { resellerId, month, year, amount } = req.body;
    if (!resellerId || !month || !year || amount === undefined) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const ledger = await LedgerService.recordPayout(resellerId, month, year, parseFloat(amount));
    res.status(200).json({ success: true, ledger });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Reseller: Get my earnings history and current strategy
export const getMyEarnings = async (req, res) => {
  try {
    const resellerId = req.user.id;
    const history = await LedgerService.getResellerHistory(resellerId);
    const reseller = await Reseller.findById(resellerId).select("marginConfig name companyName");

    // Get current month ledger for progress tracking if slab-wise
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentLedger = await ResellerLedger.findOne({ 
      resellerId, 
      month: currentMonth, 
      year: currentYear 
    });

    res.status(200).json({
      success: true,
      history,
      currentLedger,
      marginConfig: reseller.marginConfig,
      reseller: {
        name: reseller.name,
        companyName: reseller.companyName
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Update Reseller Margin Config
export const updateMarginConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const { marginConfig } = req.body;

        const reseller = await Reseller.findByIdAndUpdate(
            id,
            { marginConfig },
            { new: true }
        );

        res.status(200).json({ success: true, reseller });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
