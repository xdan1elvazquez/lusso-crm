import { roundMoney } from "@/utils/currency";

/**
 * Calcula el Estado de Resultados (PnL) y métricas clave.
 * @param {object} financialReport - Datos crudos de ingresos {totalIncome, totalSales...}
 * @param {object} expensesReport - Datos crudos de egresos {totalExpense...}
 * @param {object} profitabilityReport - Datos de rentabilidad {global: {sales, cost, profit}}
 */
export function calculateFinancialMetrics(financialReport, expensesReport, profitabilityReport) {
    const cashFlowBalance = roundMoney(
        (Number(financialReport?.totalIncome) || 0) - (Number(expensesReport?.totalExpense) || 0)
    );
    
    const globalStats = profitabilityReport?.global || {};
    const totalSalesVal = Number(globalStats.sales) || 0;
    const totalCostVal = Number(globalStats.cost) || 0;
    const grossProfitVal = Number(globalStats.profit) || 0;
    const operatingExpensesVal = Number(expensesReport?.totalExpense) || 0;

    const pnl = {
        totalSales: totalSalesVal,
        costOfGoodsSold: totalCostVal,
        grossProfit: grossProfitVal,
        operatingExpenses: operatingExpensesVal,
        ebitda: roundMoney(grossProfitVal - operatingExpensesVal)
    };

    return {
        cashFlowBalance,
        pnl
    };
}

/**
 * Calcula el margen de utilidad porcentual de forma segura.
 */
export function calculateMarginPercent(sales, profit) {
    const s = Number(sales) || 0;
    const p = Number(profit) || 0;
    return s > 0 ? (p / s) * 100 : 0;
}