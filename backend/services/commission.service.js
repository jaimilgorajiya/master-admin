import mongoose from "mongoose";
import Reseller from "../models/reseller.model.js";
import Transaction from "../models/transaction.model.js";

class CommissionService {
  /**
   * Calculates commission for a transaction based on reseller's margin config
   */
  async calculateCommission(resellerId, totalAmount, softwareId, services = []) {
    if (!resellerId) return 0;

    const reseller = await Reseller.findById(resellerId);
    if (!reseller || !reseller.marginConfig) return 0;

    const config = reseller.marginConfig;
    let totalCommission = 0;

    // 1. Calculate Software Commission
    const softwarePrice = totalAmount - services.reduce((sum, s) => sum + (s.price || 0), 0);
    if (softwareId && softwarePrice > 0) {
      totalCommission += await this._calculateItemCommission(resellerId, softwarePrice, softwareId, "product", config);
    }

    // 2. Calculate Services Commission
    for (const service of services) {
      if (service.serviceId && service.price > 0) {
        totalCommission += await this._calculateItemCommission(resellerId, service.price, service.serviceId, "service", config);
      }
    }

    return parseFloat(totalCommission.toFixed(2));
  }

  async _calculateItemCommission(resellerId, amount, itemId, itemType, config) {
    let commission = 0;
    const isProduct = itemType === "product";
    const specificList = isProduct ? config.productSpecific : (config.serviceSpecific || []);
    const idField = isProduct ? "softwareId" : "serviceId";

    switch (config.mode) {
      case "overall":
        commission = this._applyMargin(amount, config.overall);
        break;

      case "product_specific":
      case "service_specific":
        const specificConfig = specificList.find(
          (p) => p[idField] && itemId && p[idField].toString() === itemId.toString()
        );

        if (specificConfig) {
          if (specificConfig.mode === "slab_wise" && specificConfig.slabs && specificConfig.slabs.length > 0) {
            const monthlyRevenue = await this._getMonthlyRevenue(resellerId);
            const slab = specificConfig.slabs.find(
              (s) => monthlyRevenue >= s.minRevenue && monthlyRevenue <= s.maxRevenue
            );
            if (slab) {
              commission = this._applyMargin(amount, slab);
            } else {
              const sortedSlabs = [...specificConfig.slabs].sort((a,b) => b.maxRevenue - a.maxRevenue);
              if (monthlyRevenue > sortedSlabs[0].maxRevenue) {
                commission = this._applyMargin(amount, sortedSlabs[0]);
              } else {
                commission = this._applyMargin(amount, config.overall);
              }
            }
          } else {
            commission = this._applyMargin(amount, specificConfig);
          }
        } else {
          commission = this._applyMargin(amount, config.overall);
        }
        break;

      case "slab_wise":
        const monthlyRevenue = await this._getMonthlyRevenue(resellerId);
        const slab = config.slabs.find(
          (s) => monthlyRevenue >= s.minRevenue && monthlyRevenue <= s.maxRevenue
        );
        if (slab) {
          commission = this._applyMargin(amount, slab);
        } else {
            const sortedSlabs = config.slabs.sort((a,b) => b.maxRevenue - a.maxRevenue);
            if(sortedSlabs.length > 0 && monthlyRevenue > sortedSlabs[0].maxRevenue) {
                commission = this._applyMargin(amount, sortedSlabs[0]);
            } else {
                commission = this._applyMargin(amount, config.overall);
            }
        }
        break;

      default:
        commission = 0;
    }
    return commission;
  }

  _applyMargin(amount, { type, value, margin }) {
    const marginValue = value !== undefined ? value : margin;
    if (type === "percentage") {
      return (amount * marginValue) / 100;
    } else if (type === "flat") {
      return marginValue;
    }
    return 0;
  }

  async _getMonthlyRevenue(resellerId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const result = await Transaction.aggregate([
      {
        $match: {
          resellerId: new mongoose.Types.ObjectId(resellerId),
          status: "success",
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }
}

export default new CommissionService();
