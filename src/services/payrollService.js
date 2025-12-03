import { getAllSales } from "./salesStorage";
import { getEmployees } from "./employeesStorage";

export async function calculatePayrollReport(year, month, period = 'MONTH') {
    const [employees, sales] = await Promise.all([
        getEmployees(),
        getAllSales()
    ]);
    
    const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
    
    const report = employees.map(emp => {
        const empSales = sales.filter(s => {
            const saleDate = s.createdAt.slice(0, 10);
            if (!saleDate.startsWith(targetPrefix)) return false;

            const sellerName = (s.soldBy || "").toLowerCase().trim();
            const empName = (emp.name || "").toLowerCase().trim();
            if (sellerName !== empName) return false;

            const day = parseInt(saleDate.split('-')[2]);
            if (period === 'Q1' && day > 15) return false;
            if (period === 'Q2' && day <= 15) return false;

            return true;
        });

        const totalSales = empSales.reduce((sum, s) => sum + s.total, 0);
        const commissionAmount = Math.floor(totalSales * (emp.commissionPercent || 0) / 100);
        const monthlySalary = Number(emp.baseSalary) || 0;
        const baseSalary = period === 'MONTH' ? monthlySalary : (monthlySalary / 2);

        return {
            id: emp.id,
            name: emp.name,
            role: emp.role,
            commissionPercent: emp.commissionPercent || 0,
            salesCount: empSales.length,
            totalSales,
            commissionAmount,
            baseSalary, 
            totalToPay: commissionAmount + baseSalary
        };
    });

    return report;
}